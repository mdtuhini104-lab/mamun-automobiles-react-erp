import React from 'react';
import { Card, Typography, Button, Space, Divider, Upload, Table, message, Modal, Row, Col, Tabs, Tag, Input, Tooltip, Progress } from 'antd';
import { Database, FileText, Layers, UploadCloud, Download, AlertTriangle, RefreshCw, Trash2, Clock, ShieldCheck, HardDrive, Zap } from 'lucide-react';
import dayjs from 'dayjs';
import axios from 'axios';
// import JSZip from 'jszip'; // Temporary disable to fix build failure (dependency missing in node_modules)
import { getApiBaseUrl } from '../utils/appConfig';
import { t } from '../utils/translations';
import { useGlobalState } from '../contexts/GlobalStateContext';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { TabPane } = Tabs;

const api = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 60000, // Increased for large file zipping
    headers: { 'Content-Type': 'application/json' }
});

// Helper to inject user headers for RBAC enforcement (matches databaseBridge logic)
const getAuthHeaders = () => {
    try {
        const userStr = localStorage.getItem('mamun_auth_user');
        if (!userStr) return {};
        const user = JSON.parse(userStr);
        return {
            'x-user-id': String(user.id || '').trim(),
            'x-user-role': String(user.role || '').trim(),
            'x-user-post': String(user.specific_post || '').trim(),
            'x-user-email': String(user.email || '').trim().toLowerCase()
        };
    } catch (err) {
        console.error('Failed to parse auth user', err);
        return {};
    }
};

const BackupModule = ({ isDark }) => {
    const { language } = useGlobalState();
    const [history, setHistory] = React.useState([]);
    const [loadingHistory, setLoadingHistory] = React.useState(false);
    const [generating, setGenerating] = React.useState(false);
    const [restoring, setRestoring] = React.useState(false);
    const [fileToRestore, setFileToRestore] = React.useState(null);
    const [restoreModalVisible, setRestoreModalVisible] = React.useState(false);
    const [confirmText, setConfirmText] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('all');
    const [cloudStatus, setCloudStatus] = React.useState(null);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [chunkStatus, setChunkStatus] = React.useState('');

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await api.get('/backups/history', {
                headers: { ...getAuthHeaders() }
            });
            if (res.data.success) {
                setHistory(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch backup history', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchCloudStatus = async () => {
        try {
            const res = await api.get('/backups/status', {
                headers: { ...getAuthHeaders() }
            });
            if (res.data.success) {
                setCloudStatus(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch cloud status', error);
        }
    };

    React.useEffect(() => {
        fetchHistory();
        fetchCloudStatus();
    }, []);

    const handleGenerateManualBackup = async (type = 'database') => {
        setGenerating(true);
        const hide = message.loading({ content: `SECURE PROTOCOL: Initializing ${type.toUpperCase()} Extraction...`, key: 'backup_gen' });
        try {
            const response = await fetch(`${getApiBaseUrl()}/backups/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ type })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Backup Generation Failed on Server.');
            }

            const blob = await response.blob();
            const disposition = response.headers.get('content-disposition');
            let filename = `mamun_erp_${type}_${dayjs().format('YYYYMMDD_HHmmss')}.${type === 'database' ? 'json' : 'zip'}`;
            
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) { 
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            message.success({ content: `SUCCESS: ${type.toUpperCase()} package delivered safely to your PC.`, key: 'backup_gen' });
            fetchHistory();
        } catch (error) {
            console.error(error);
            message.error({ content: error.message || 'Fatal Error during protocol execution.', key: 'backup_gen' });
        } finally {
            setGenerating(false);
        }
    };

    const confirmRestore = async () => {
        if (!fileToRestore) return message.error("Integrity Error: No file detected!");
        
        const isZip = fileToRestore.name.toLowerCase().endsWith('.zip');
        if (isZip && cloudStatus?.status !== 'PROTOCOL_READY') {
            return message.error("CRITICAL BLOCKER: Cloudinary is not configured. ZIP restoration requires active cloud storage.");
        }

        setRestoring(true);
        setUploadProgress(0);
        setChunkStatus('Initializing secure snapshot protocol...');
        
        // SECURE CHUNKED PROTOCOL: Split large payloads into 1MB parts to bypass Vercel limits
        const CHUNK_SIZE = 1 * 1024 * 1024; 

        try {
            let dbPayloadStr = '';
            let imageEntries = [];
            let jszipInstance = null;

            if (isZip) {
                // ZIP Restoration is temporarily disabled due to missing jszip dependency
                throw new Error('CRITICAL ERROR: ZIP Restoration protocol is currently offline. Please install "jszip" and rebuild the application to enable this feature.');
                
                /* 
                setChunkStatus('Extracting ZIP archive locally...');
                jszipInstance = new JSZip();
                const zip = await jszipInstance.loadAsync(fileToRestore);
                
                const dbFile = Object.keys(zip.files).find(name => name === 'db.json' || name === 'database_backup.json' || name.endsWith('.json'));
                if (!dbFile) throw new Error('Critical Error: No database snapshot found in the provided ZIP.');
                
                dbPayloadStr = await zip.file(dbFile).async('string');
                
                const hasImagesDir = Object.keys(zip.files).some(name => name.startsWith('images/') || name.startsWith('images\\'));
                const hasUploadsDir = Object.keys(zip.files).some(name => name.startsWith('images/') || name.startsWith('images\\'));
                const zipImageDir = hasImagesDir ? 'images' : (hasUploadsDir ? 'uploads' : null);

                if (zipImageDir) {
                    imageEntries = Object.keys(zip.files).filter(name => 
                        (name.startsWith(`${zipImageDir}/`) || name.startsWith(`${zipImageDir}\\`)) && !zip.files[name].dir
                    );
                }
                */
            } else {
                setChunkStatus('Reading JSON file locally...');
                dbPayloadStr = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = e => reject(new Error('Failed to read JSON file.'));
                    reader.readAsText(fileToRestore);
                });
            }

            // PHASE 1: Initialize Session and Send Database in Chunks
            setChunkStatus('Preparing database snapshot...');
            const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            
            const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB chunks
            const totalChunks = Math.ceil(dbPayloadStr.length / CHUNK_SIZE);

            setChunkStatus('Transmitting database (0% completed)...');
            for (let i = 0; i < totalChunks; i++) {
                const chunkData = dbPayloadStr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                
                const initRes = await api.post('/backups/restore/init_chunk', {
                    sessionId,
                    chunkIndex: i,
                    totalChunks,
                    data: chunkData,
                    totalImages: imageEntries.length
                }, {
                    headers: { ...getAuthHeaders() }
                });

                if (!initRes.data.success) {
                    throw new Error(initRes.data.message || 'Database chunk transmission failed.');
                }

                setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
                setChunkStatus(`Transmitting database (${Math.round(((i + 1) / totalChunks) * 100)}% completed)...`);
            }

            const totalImages = imageEntries.length;

            // PHASE 2: Chunked Image Upload (Supports large assets via sub-chunking)
            if (totalImages > 0 && jszipInstance) {
                setChunkStatus(`Syncing 0 of ${totalImages} assets to Cloudinary...`);
                let uploadedCount = 0;

                for (let i = 0; i < imageEntries.length; i++) {
                    const fileName = imageEntries[i];
                    const base64Data = await jszipInstance.file(fileName).async('base64');
                    
                    const fileChunksCount = Math.ceil(base64Data.length / CHUNK_SIZE);
                    let lastRes = null;

                    for (let c = 0; c < fileChunksCount; c++) {
                        const chunk = base64Data.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
                        const chunkRes = await api.post('/backups/restore/chunk', { 
                            sessionId,
                            fileName,
                            chunkIndex: c,
                            totalChunks: fileChunksCount,
                            data: chunk
                        }, {
                            headers: { ...getAuthHeaders() }
                        });

                        if (!chunkRes.data.success) {
                            throw new Error(chunkRes.data.message || `File chunk ${c} failed for ${fileName}`);
                        }
                        lastRes = chunkRes;
                    }

                    uploadedCount = lastRes.data.uploaded;
                    const percent = Math.round((uploadedCount / totalImages) * 100);
                    setUploadProgress(percent);
                    setChunkStatus(`Syncing ${uploadedCount} of ${totalImages} assets to Cloudinary...`);
                }
            }

            // PHASE 3: Finalization
            setChunkStatus('Finalizing database rewrite... Please do not close this window.');
            const finalizeRes = await api.post('/backups/restore/finalize', { sessionId }, {
                headers: { ...getAuthHeaders() }
            });

            if (finalizeRes.data.success) {
                message.success(finalizeRes.data.message || 'CRITICAL SUCCESS: Data baseline restored, rebooting system...');
                fetchHistory();
                setRestoreModalVisible(false);
                setFileToRestore(null);
                setConfirmText('');
                setUploadProgress(0);
                setTimeout(() => window.location.reload(), 2000);
            } else {
                message.error(finalizeRes.data.message);
            }
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.message || error.message || 'Restore procedure failed.');
        } finally {
            setRestoring(false);
            setChunkStatus('');
        }
    };

    const uploadProps = {
        name: 'backupFile',
        multiple: false,
        beforeUpload: (file) => {
            const isJson = file.type === 'application/json' || file.name.endsWith('.json');
            const isZip = file.type === 'application/zip' || file.name.endsWith('.zip') || file.type === 'application/x-zip-compressed';
            
            if (!isJson && !isZip) {
                message.error('Security Rejection: Only Native .json or .zip backup files are accepted!');
                return Upload.LIST_IGNORE;
            }
            setFileToRestore(file);
            setRestoreModalVisible(true);
            return false;
        },
        onRemove: () => setFileToRestore(null),
        fileList: fileToRestore ? [fileToRestore] : [],
        showUploadList: false
    };

    const getFilteredHistory = () => {
        if (activeTab === 'all') return history;
        if (activeTab === 'database') return history.filter(h => h.fileName?.includes('-db-') || h.fileName?.includes('_DB_') || h.fileName?.includes('_database_'));
        if (activeTab === 'files') return history.filter(h => h.fileName?.includes('-files-'));
        if (activeTab === 'full') return history.filter(h => h.fileName?.includes('-full-'));
        return [];
    };

    const dbCount = history.filter(h => h.fileName?.includes('-db-') || h.fileName?.includes('_DB_') || h.fileName?.includes('_database_')).length;
    const fileCount = history.filter(h => h.fileName?.includes('-files-')).length;
    const fullCount = history.filter(h => h.fileName?.includes('-full-')).length;
    
    const cardStyle = {
        borderRadius: '24px',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(20px)',
        marginBottom: '24px',
        overflow: 'hidden',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2), 0 15px 35px rgba(0,0,0,0.3)'
    };

    const optionStyle = (color = '#3B82F6') => ({
        border: '1px solid rgba(59, 130, 246, 0.1)',
        borderRadius: '20px',
        padding: '40px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
        background: 'rgba(15, 23, 42, 0.4)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    });

    const getBackupTypeTag = (fileName = '') => {
        const fn = fileName.toLowerCase();
        if (fn.includes('-db-') || fn.includes('_db_') || fn.includes('_database')) return <Tag color="blue" style={{ borderRadius: '20px', fontWeight: 900, fontSize: '10px' }}>DATABASE</Tag>;
        if (fn.includes('-files-')) return <Tag color="cyan" style={{ borderRadius: '20px', fontWeight: 900, fontSize: '10px' }}>FILES</Tag>;
        if (fn.includes('-full-')) return <Tag color="purple" style={{ borderRadius: '20px', fontWeight: 900, fontSize: '10px' }}>FULL SNAPSHOT</Tag>;
        return <Tag style={{ borderRadius: '20px', fontWeight: 900, fontSize: '10px' }}>LEGACY</Tag>;
    };

    return (
        <div style={{ padding: '0 0px', maxWidth: '1320px', margin: '0 auto' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                         <div style={{ background: '#3B82F6', padding: '12px', borderRadius: '14px', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)' }}>
                             <ShieldCheck size={28} color="white" />
                         </div>
                         <Title level={2} style={{ margin: 0, fontWeight: 900, color: '#FFF', letterSpacing: '-0.5px', textTransform: 'uppercase', fontSize: '28px' }}>
                             {language === 'bn' ? 'ডাটাবেস ও রিকভারী সেন্টার' : 'Database & Recovery Center'}
                         </Title>
                    </div>
                     <Text style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 500, marginLeft: '60px' }}>
                        {language === 'bn' ? 'আপনার সম্পূর্ণ সিস্টেম ব্যাকআপ এবং রিস্টোর ম্যানেজমেন্ট এখানে করুন' : 'Advanced extraction and restoration protocols for system data.'}
                    </Text>
                </div>
                <Space size={16}>
                    {cloudStatus && (
                        <Tooltip title={cloudStatus.status === 'PROTOCOL_READY' ? 'Cloudinary Connected' : 'Cloudinary Keys Missing'}>
                             <div style={{ 
                                padding: '8px 16px', 
                                background: cloudStatus.status === 'PROTOCOL_READY' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                border: `1px solid ${cloudStatus.status === 'PROTOCOL_READY' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                             }}>
                                <UploadCloud size={16} color={cloudStatus.status === 'PROTOCOL_READY' ? '#10B981' : '#EF4444'} />
                                <span style={{ color: cloudStatus.status === 'PROTOCOL_READY' ? '#10B981' : '#EF4444', fontWeight: 900, fontSize: '11px', letterSpacing: '1px' }}>
                                    {cloudStatus.status === 'PROTOCOL_READY' ? 'CLOUD: ACTIVE' : 'CLOUD: OFFLINE'}
                                </span>
                             </div>
                        </Tooltip>
                    )}
                    <Button 
                        icon={<RefreshCw size={16} />} 
                        onClick={() => { fetchHistory(); fetchCloudStatus(); }} 
                        style={{ height: '44px', border: '1px solid #3B82F6', color: '#3B82F6', background: 'transparent', fontWeight: 800, borderRadius: '10px' }}
                    >
                        REFRESH
                    </Button>
                </Space>
            </div>

            {/* Create New Backup - Premium Module */}
            <div style={cardStyle}>
                <div style={{ padding: '40px' }}>
                    <div style={{ marginBottom: 40 }}>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: '#3B82F6', letterSpacing: '3px', marginBottom: 8 }}>PROTOCOL: SYSTEM EXTRACTION</div>
                        <Title level={3} style={{ margin: 0, color: '#FFF', fontWeight: 900 }}>Select Extraction Target</Title>
                    </div>
                    
                    <Row gutter={[24, 24]}>
                        <Col xs={24} md={8}>
                            <div 
                                style={optionStyle('#3B82F6')}
                                onClick={!generating ? () => handleGenerateManualBackup('database') : undefined}
                                className="extraction-card-3d"
                            >
                                <div className="icon-3d-wrapper" style={{ 
                                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', 
                                    padding: '24px', 
                                    borderRadius: '24px', 
                                    marginBottom: '24px',
                                    boxShadow: '0 15px 35px rgba(59, 130, 246, 0.4)'
                                }}>
                                    <Database size={48} color="white" />
                                </div>
                                <Title level={4} style={{ margin: '0 0 8px 0', color: '#FFF', fontWeight: 900 }}>
                                    {generating ? 'Processing...' : 'Database Only'}
                                </Title>
                                <Text style={{ fontSize: '12px', color: '#94A3B8' }}>Universal .JSON data baseline</Text>
                                <div className="glow-strip" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', background: '#3B82F6', transform: 'scaleX(0)', transition: '0.4s' }}></div>
                            </div>
                        </Col>
                        <Col xs={24} md={8}>
                            <div 
                                style={optionStyle('#00D2FF')}
                                onClick={!generating ? () => handleGenerateManualBackup('files') : undefined}
                                className="extraction-card-3d"
                            >
                                <div className="icon-3d-wrapper" style={{ 
                                    background: 'linear-gradient(135deg, #00D2FF 0%, #3B82F6 100%)', 
                                    padding: '24px', 
                                    borderRadius: '24px', 
                                    marginBottom: '24px',
                                    boxShadow: '0 15px 35px rgba(0, 210, 255, 0.4)'
                                }}>
                                    <FileText size={48} color="white" />
                                </div>
                                <Title level={4} style={{ margin: '0 0 8px 0', color: '#FFF', fontWeight: 900 }}>
                                    {generating ? 'Compressing...' : 'Cloud Assets'}
                                </Title>
                                <Text style={{ fontSize: '12px', color: '#94A3B8' }}>Document & Image Media (.ZIP)</Text>
                                <div className="glow-strip" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', background: '#00D2FF', transform: 'scaleX(0)', transition: '0.4s' }}></div>
                            </div>
                        </Col>
                        <Col xs={24} md={8}>
                            <div 
                                style={optionStyle('#A855F7')}
                                onClick={!generating ? () => handleGenerateManualBackup('full') : undefined}
                                className="extraction-card-3d"
                            >
                                <div className="icon-3d-wrapper" style={{ 
                                    background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)', 
                                    padding: '24px', 
                                    borderRadius: '24px', 
                                    marginBottom: '24px',
                                    boxShadow: '0 15px 35px rgba(168, 85, 247, 0.4)'
                                }}>
                                    <Zap size={48} color="white" />
                                </div>
                                <Title level={4} style={{ margin: '0 0 8px 0', color: '#FFF', fontWeight: 900 }}>
                                    {generating ? 'Finalizing...' : 'Omni Snapshot'}
                                </Title>
                                <Text style={{ fontSize: '12px', color: '#94A3B8' }}>Full System Image (DB + Assets)</Text>
                                <div className="glow-strip" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', background: '#A855F7', transform: 'scaleX(0)', transition: '0.4s' }}></div>
                            </div>
                        </Col>
                    </Row>
                </div>
            </div>

            {/* Secure Restore Zone */}
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={10}>
                    <div style={{...cardStyle, height: '100%', padding: '40px'}}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '10px' }}>
                                <UploadCloud size={20} color="#3B82F6" />
                            </div>
                            <Title level={4} style={{ margin: 0, color: '#FFF', fontWeight: 900 }}>SECURE RESTORE</Title>
                        </div>
                        <Text style={{ color: '#94A3B8', fontSize: '14px', display: 'block', marginBottom: 32 }}>
                            Inject a valid system snapshot to restore the primary database state.
                        </Text>
                        
                        <Dragger {...uploadProps} className="neon-restore-dragger">
                            <div style={{ padding: '20px 0' }}>
                                <div style={{ width: '80px', height: '80px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <HardDrive size={40} color="#3B82F6" />
                                </div>
                                <Title level={5} style={{ color: '#FFF', margin: '0 0 8px 0' }}>Deploy Snapshot Package</Title>
                                <Text style={{ fontSize: '12px', color: '#64748B' }}>Drag & drop .json or .zip files</Text>
                            </div>
                        </Dragger>

                        <div style={{ marginTop: 32, padding: '20px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                            <Space align="start">
                                <AlertTriangle size={18} color="#ef4444" style={{ marginTop: 2 }} />
                                <Text style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>
                                    WARNING: Restore protocol will overwrite current live data. This action is logged.
                                </Text>
                            </Space>
                        </div>
                    </div>
                </Col>

                {/* Audit History Log */}
                <Col xs={24} lg={14}>
                    <div style={{...cardStyle, height: '100%'}}>
                        <div style={{ padding: '40px 40px 0 40px' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                 <Title level={4} style={{ margin: 0, color: '#FFF', fontWeight: 900 }}>PROTOCOL AUDIT LOG</Title>
                                 <div style={{ padding: '4px 12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '20px', color: '#3B82F6', fontWeight: 900, fontSize: '10px' }}>
                                    {history.length} ENTRIES
                                 </div>
                             </div>
                             <Text style={{ color: '#94A3B8', fontSize: '12px' }}>Comprehensive trail of all extraction/restoration activities.</Text>
                        </div>
                        
                        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: 20, paddingLeft: '40px' }} className="security-tabs">
                            <TabPane tab="ALL" key="all" />
                            <TabPane tab="DATABASE" key="database" />
                            <TabPane tab="ASSETS" key="files" />
                            <TabPane tab="FULL" key="full" />
                        </Tabs>
                        
                        <div style={{ padding: '24px 40px 40px 40px', minHeight: '340px', maxHeight: '450px', overflowY: 'auto' }}>
                            {loadingHistory ? (
                                 <div style={{ textAlign: 'center', padding: '60px' }}><RefreshCw className="spinning" size={32} color="#3B82F6" /></div>
                            ) : getFilteredHistory().length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px' }}>
                                    <Database size={48} color="rgba(255,255,255,0.05)" style={{ marginBottom: 16 }} />
                                    <div style={{ color: '#475569', fontWeight: 800, letterSpacing: '1px' }}>NO AUDIT LOGS DETECTED</div>
                                </div>
                            ) : (
                                getFilteredHistory().map(item => (
                                    <div key={item._id} className="protocol-history-item">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <div className="status-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6', boxShadow: '0 0 10px #3B82F6' }}></div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                                                    <Text strong style={{ color: '#FFF', fontSize: '13px', fontFamily: 'monospace' }}>
                                                        {item.fileName?.length > 30 ? item.fileName.substring(0, 30) + '...' : item.fileName}
                                                    </Text>
                                                    {getBackupTypeTag(item.fileName)}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '10px', color: '#64748B', fontWeight: 800 }}>
                                                    <span style={{ color: '#3B82F6' }}>{item.fileSizeKB} KB</span>
                                                    <span>•</span>
                                                    <span>{dayjs(item.createdAt).format('YYYY-MM-DD | HH:mm')}</span>
                                                    <span>•</span>
                                                    <span style={{ color: '#94A3B8' }}>BY: {item.performedBy?.split('@')[0].toUpperCase()}</span>
                                                </div>
                                            </div>
                                            <div className="action-btns">
                                                <Button type="text" size="small" icon={<Download size={14} color="#3B82F6" />} />
                                                <Button type="text" size="small" icon={<Trash2 size={14} color="#EF4444" />} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Red Alert Restore Warning Modal */}
            <Modal
                title={
                    <Space>
                        <AlertTriangle color="#ef4444" size={24} />
                        <span style={{ color: '#ef4444', fontWeight: 900, fontSize: 18, letterSpacing: '1px' }}>RED ALERT: SYSTEM OVERWRITE</span>
                    </Space>
                }
                open={restoreModalVisible}
                onOk={confirmRestore}
                onCancel={() => {
                    setRestoreModalVisible(false);
                    setFileToRestore(null);
                    setConfirmText('');
                }}
                okText="AUTHORIZE FULL RESTORATION"
                cancelText="ABORT"
                okButtonProps={{ danger: true, size: 'large', loading: restoring, disabled: confirmText !== 'RESTORE', style: { fontWeight: 900 } }}
                cancelButtonProps={{ size: 'large', style: { fontWeight: 700 } }}
                styles={{ header: { borderBottom: '1px solid #fee2e2', paddingBottom: 15 } }}
                width={600}
                centered
            >
                <div style={{ marginTop: 20 }}>
                    <div style={{ background: '#7f1d1d', border: '2px solid #ef4444', padding: 20, borderRadius: 12, marginBottom: 25, boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShieldCheck size={20} /> IRREVERSIBLE ACTION DETECTED
                        </div>
                        <p style={{ color: '#fecaca', margin: 0, fontSize: 13, lineHeight: 1.6, fontWeight: 500 }}>
                            {language === 'bn' ? 
                             'সতর্কতা! এই কাজটির ফলে আপনার বর্তমান ডাটাবেস এবং আপলোড করা ইমেজগুলো মুছে যাবে এবং ব্যাকআপ ফাইলটি দিয়ে রিপ্লেস হবে।' : 
                             'Warning! This procedure will completely wipe your existing database and images, replacing them with the snapshot contents.'}
                        </p>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <Text style={{ color: '#94A3B8', fontSize: 12 }}>Staged File Integrity Check:</Text>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 15px', borderRadius: 8, marginTop: 5, border: '1px solid rgba(255,255,255,0.1)' }}>
                             <Text strong style={{ color: '#FFF', fontFamily: 'monospace', fontSize: 14 }}>{fileToRestore?.name}</Text>
                        </div>
                    </div>

                    {restoring ? (
                        <div style={{ padding: '20px 0', textAlign: 'center' }}>
                            <Progress 
                                type="circle" 
                                percent={uploadProgress} 
                                size={120}
                                strokeColor={{ '0%': '#3B82F6', '100%': '#10b981' }}
                            />
                            <div style={{ marginTop: 20 }}>
                                <Text strong style={{ color: '#3B82F6', fontSize: 16 }}>
                                    {chunkStatus || 'Processing...'}
                                </Text>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Divider style={{ margin: '20px 0', borderColor: 'rgba(255,255,255,0.05)' }} />
                            <p style={{ color: '#FFF', fontWeight: 800, marginBottom: 12, fontSize: 14 }}>
                                {language === 'bn' ? 'নিশ্চিত করতে হুবহু টাইপ করুন:' : 'TO PROCEED, PLEASE TYPE:'} 
                                <span style={{ color: '#ef4444', marginLeft: 10, fontSize: 20, letterSpacing: 2 }}>RESTORE</span>
                            </p>
                            <Input 
                                placeholder="AUTHENTICATION REQUIRED" 
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                style={{ height: 55, fontSize: 20, fontWeight: 900, textAlign: 'center', letterSpacing: 4, background: '#000', border: '2px solid #ef4444', color: '#ef4444' }}
                            />
                        </>
                    )}
                </div>
            </Modal>

            <style>{`
                .extraction-card-3d:hover {
                    transform: translateY(-10px);
                    border-color: rgba(59, 130, 246, 0.4) !important;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.5) !important;
                    background: rgba(30, 41, 59, 0.9) !important;
                }
                .extraction-card-3d:hover .icon-3d-wrapper {
                    transform: scale(1.1) rotate(5deg);
                }
                .extraction-card-3d:hover .glow-strip {
                    transform: scaleX(1);
                }
                .neon-restore-dragger {
                    background: rgba(15, 23, 42, 0.4) !important;
                    border: 2px dashed rgba(59, 130, 246, 0.3) !important;
                    border-radius: 20px !important;
                    transition: all 0.3s ease !important;
                }
                .neon-restore-dragger:hover {
                    border-color: #3B82F6 !important;
                    background: rgba(59, 130, 246, 0.05) !important;
                    box-shadow: 0 0 30px rgba(59, 130, 246, 0.2);
                }
                .protocol-history-item {
                    background: rgba(15, 23, 42, 0.3);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    padding: 16px 20px;
                    margin-bottom: 12px;
                    transition: all 0.3s ease;
                }
                .protocol-history-item:hover {
                    border-color: rgba(59, 130, 246, 0.3);
                    background: rgba(30, 41, 59, 0.5);
                    transform: translateX(8px);
                }
                .spinning { animation: spin 2s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                .security-tabs .ant-tabs-nav::before { border-bottom: none !important; }
                .security-tabs .ant-tabs-tab { 
                    font-weight: 900 !important; 
                    font-size: 11px !important; 
                    letter-spacing: 2px; 
                    padding: 12px 0 !important;
                    margin-right: 32px !important;
                    color: #475569 !important;
                }
                .security-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #3B82F6 !important; }
                .security-tabs .ant-tabs-ink-bar { background: #3B82F6 !important; height: 3px !important; }
            `}</style>
        </div>
    );
};

export default BackupModule;
