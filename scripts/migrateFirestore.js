#!/usr/bin/env node
import fs from 'fs';
import process from 'process';
import admin from 'firebase-admin';

function initAdminIfAvailable() {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        return admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }

    if (process.env.SERVICE_ACCOUNT_JSON) {
        try {
            const obj = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
            return admin.initializeApp({ credential: admin.credential.cert(obj) });
        } catch (e) {
            console.error('SERVICE_ACCOUNT_JSON invalid JSON');
            process.exit(1);
        }
    }

    return null;
}

function normalizeDepartmentsList(input) {
    if (!Array.isArray(input)) return [];
    return input
        .map((x) => (typeof x === 'string' ? x.trim() : ''))
        .filter(Boolean);
}

function buildDepartmentsTasksObject({ departmentsInvolved, department }) {
    const normalized = normalizeDepartmentsList(departmentsInvolved);
    const dep = typeof department === 'string' ? department.trim() : '';
    const finalDepartments = normalized.length > 0 ? normalized : (dep ? [dep] : ['General']);

    const obj = {};
    for (const d of finalDepartments) {
        obj[d] = { tasks: [], status: 'pending' };
    }
    return obj;
}

function buildDepartmentsTasksTypedValue({ departmentsInvolved, department }) {
    const map = buildDepartmentsTasksObject({ departmentsInvolved, department });
    const fields = {};

    for (const key of Object.keys(map)) {
        fields[key] = {
            mapValue: {
                fields: {
                    tasks: { arrayValue: { values: [] } },
                    status: { stringValue: 'pending' }
                }
            }
        };
    }

    return { mapValue: { fields } };
}

function getEnv(name) {
    const v = process.env[name];
    return typeof v === 'string' && v.trim() ? v.trim() : '';
}

function getRestConfig(projectIdFromAdmin = '') {
    const projectId =
        getEnv('FIREBASE_PROJECT_ID') ||
        getEnv('VITE_FIREBASE_PROJECT_ID') ||
        getEnv('REACT_APP_FIREBASE_PROJECT_ID') ||
        projectIdFromAdmin;

    const apiKey =
        getEnv('FIREBASE_WEB_API_KEY') ||
        getEnv('VITE_FIREBASE_API_KEY') ||
        getEnv('FIREBASE_API_KEY') ||
        getEnv('REACT_APP_FIREBASE_API_KEY');

    if (!projectId || !apiKey) {
        return null;
    }

    return { projectId, apiKey };
}

async function migrateUsersCollection(db) {
    const roleDesignationMap = {
        Admin: 'Department Head',
        Manager: 'Manager',
        Staff: 'Helper',
        Customer: 'N/A'
    };

    console.log('Scanning users collection...');
    const usersSnap = await db.collection('users').get();
    let usersUpdated = 0;

    for (const doc of usersSnap.docs) {
        const data = doc.data() || {};
        const updates = {};
        if (typeof data.subStaffPosts === 'undefined') updates.subStaffPosts = {};
        if (typeof data.designation === 'undefined' || data.designation === null) {
            const mapped = roleDesignationMap[data.role] || 'Helper';
            updates.designation = mapped;
        }
        if (typeof data.department === 'undefined' || data.department === null) updates.department = data.department ?? 'N/A';

        if (Object.keys(updates).length > 0) {
            await db.collection('users').doc(doc.id).update(updates);
            usersUpdated++;
            console.log(`Updated user ${doc.id}:`, updates);
        }
    }

    console.log(`Users scanned: ${usersSnap.size}. Updated: ${usersUpdated}`);
    return { scanned: usersSnap.size, updated: usersUpdated };
}

async function migrateWorkshopJobCardsWithAdmin(db) {
    console.log('Scanning workshops/mamun_auto_data jobCards field...');
    const workshopRef = db.collection('workshops').doc('mamun_auto_data');
    const snap = await workshopRef.get();

    if (!snap.exists) {
        console.log('workshops/mamun_auto_data does not exist. Nothing to update for jobCards.');
        return { scanned: 0, updated: 0 };
    }

    const data = snap.data() || {};
    const jobCards = Array.isArray(data.jobCards) ? data.jobCards : [];
    if (!Array.isArray(data.jobCards)) {
        console.log('No jobCards array found in workshops/mamun_auto_data.');
        return { scanned: 0, updated: 0 };
    }

    let jobsUpdated = 0;
    const nextJobCards = jobCards.map((job) => {
        const source = job || {};
        if (typeof source.departmentsTasks !== 'undefined' && source.departmentsTasks !== null) {
            return source;
        }

        jobsUpdated++;
        return {
            ...source,
            departmentsTasks: buildDepartmentsTasksObject({
                departmentsInvolved: source.departmentsInvolved,
                department: source.department
            })
        };
    });

    if (jobsUpdated > 0) {
        await workshopRef.set({ jobCards: nextJobCards }, { merge: true });
    }

    console.log(`Workshop jobCards scanned: ${jobCards.length}. Updated: ${jobsUpdated}`);
    return { scanned: jobCards.length, updated: jobsUpdated };
}

async function fetchWorkshopDocViaRest({ projectId, apiKey }) {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/workshops/mamun_auto_data?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);

    if (res.status === 404) {
        return null;
    }

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`REST get workshop doc failed: ${res.status} ${text}`);
    }

    return res.json();
}

async function patchWorkshopJobCardsViaRest({ projectId, apiKey }, jobCardsTyped) {
    const mask = encodeURIComponent('jobCards');
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/workshops/mamun_auto_data?updateMask.fieldPaths=${mask}&key=${encodeURIComponent(apiKey)}`;
    const body = JSON.stringify({
        fields: {
            jobCards: jobCardsTyped
        }
    });

    const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`REST patch workshop doc failed: ${res.status} ${text}`);
    }
}

async function migrateWorkshopJobCardsWithRest(restConfig) {
    console.log('Scanning workshops/mamun_auto_data jobCards field via REST...');
    const workshopDoc = await fetchWorkshopDocViaRest(restConfig);
    if (!workshopDoc) {
        console.log('workshops/mamun_auto_data does not exist. Nothing to update for jobCards.');
        return { scanned: 0, updated: 0 };
    }

    const fields = workshopDoc.fields || {};
    const jobCardsTyped = fields.jobCards;
    const values = (jobCardsTyped && jobCardsTyped.arrayValue && Array.isArray(jobCardsTyped.arrayValue.values))
        ? jobCardsTyped.arrayValue.values
        : [];

    let jobsUpdated = 0;
    for (const val of values) {
        const mapFields = val && val.mapValue && val.mapValue.fields ? val.mapValue.fields : null;
        if (!mapFields) continue;

        if (typeof mapFields.departmentsTasks === 'undefined' || mapFields.departmentsTasks === null) {
            const dept = mapFields.department && mapFields.department.stringValue ? mapFields.department.stringValue : '';
            const deps = (mapFields.departmentsInvolved && mapFields.departmentsInvolved.arrayValue && Array.isArray(mapFields.departmentsInvolved.arrayValue.values))
                ? mapFields.departmentsInvolved.arrayValue.values
                    .map((x) => (x && x.stringValue ? x.stringValue : ''))
                    .filter(Boolean)
                : [];

            mapFields.departmentsTasks = buildDepartmentsTasksTypedValue({
                departmentsInvolved: deps,
                department: dept
            });
            jobsUpdated++;
        }
    }

    if (jobsUpdated > 0) {
        const payload = {
            arrayValue: {
                values
            }
        };
        await patchWorkshopJobCardsViaRest(restConfig, payload);
    }

    console.log(`Workshop jobCards scanned: ${values.length}. Updated: ${jobsUpdated}`);
    return { scanned: values.length, updated: jobsUpdated };
}

async function migrate() {
    const app = initAdminIfAvailable();
    let usersResult = { scanned: 0, updated: 0, skipped: true };
    let jobsResult = { scanned: 0, updated: 0 };

    if (app) {
        const db = admin.firestore();
        usersResult = { ...(await migrateUsersCollection(db)), skipped: false };
        jobsResult = await migrateWorkshopJobCardsWithAdmin(db);
    } else {
        console.warn('No Firebase admin credentials found. Skipping users migration.');
        const restConfig = getRestConfig();
        if (!restConfig) {
            console.error('No Firebase admin credentials found, and REST fallback config missing.');
            console.error('Set FIREBASE_PROJECT_ID and FIREBASE_WEB_API_KEY (or VITE_FIREBASE_API_KEY/FIREBASE_API_KEY).');
            process.exit(1);
        }
        jobsResult = await migrateWorkshopJobCardsWithRest(restConfig);
    }

    console.log('Migration complete.');
    console.log(`Summary: users scanned=${usersResult.scanned}, users updated=${usersResult.updated}, users skipped=${usersResult.skipped}`);
    console.log(`Summary: workshop jobCards scanned=${jobsResult.scanned}, workshop jobCards updated=${jobsResult.updated}`);
    process.exit(0);
}

migrate().catch(e => { console.error('Migration failed', e); process.exit(1); });
