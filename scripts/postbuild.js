#!/usr/bin/env node
import { execSync } from 'child_process';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const isCi = process.env.CI === 'true' || process.env.CI === '1';
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

if (isCi || isVercel) {
    console.log('CI/Vercel environment detected. Skipping git commit/push postbuild step.');
    process.exit(0);
}

try {
    const status = execSync('git status --porcelain', { stdio: 'pipe' }).toString().trim();
    if (!status) {
        console.log('No changes detected after build. Nothing to commit.');
        process.exit(0);
    }

    console.log('Staging changes...');
    run('git add -A');

    const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
    const message = `chore(build): automated build at ${new Date().toISOString()}`;

    try {
        run(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    } catch (commitErr) {
        console.log('Commit failed (nothing to commit or commit hook prevented it).', commitErr.message || commitErr);
        // proceed to push in case there are staged changes already committed by hooks
    }

    console.log(`Pushing to origin/${branch}...`);
    run(`git push origin ${branch}`);
    console.log('Auto-push complete.');
    process.exit(0);
} catch (err) {
    console.error('Auto-push script failed:', err.message || err);
    process.exit(1);
}
