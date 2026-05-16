import React from 'react';
import dayjs from 'dayjs';
import masterLogo from '../assets/master_logo.png';
import { getAbsoluteAssetUrl } from '../utils/appConfig';
import { t } from '../utils/translations';

const DEFAULT_DETAILS = [
    'Premium Auto Care',
    'Plot # 197, Road # 13, Sector # 10, Uttara, Dhaka-1230',
    'Hotline: 01812238820, 01712524779'
];

const BrandedDocumentHeader = ({
    title,
    subtitle,
    meta = [],
    details = DEFAULT_DETAILS,
    lang = 'en'
}) => (
    <div style={{ marginBottom: 24, width: '100%', boxSizing: 'border-box' }}>
        {/* Spiritual Invocation - Centered elegantly at the absolute top of the document page */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', textAlign: 'center', fontSize: '15px', fontWeight: 600, marginBottom: 16, color: '#003399', letterSpacing: '0.2px', fontFamily: 'Georgia, serif' }}>
            Bismillahir Rahmanir Rahim
        </div>

        {/* Primary Header Section — Horizontal alignment locked at top flex line */}
        <div
            style={{
                display: 'flex',
                alignItems: 'flex-start', /* Vertical Balance: Locks logo top and right text top perfectly to the same horizontal line */
                justifyContent: 'space-between',
                gap: 16,
                borderBottom: '8px double #003399',
                paddingBottom: 16,
                marginBottom: 16,
                width: '100%',
                boxSizing: 'border-box'
            }}
        >
            {/* Left Side: Logo anchoring top-left, with compact/clean user info or subtitle below it */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', maxWidth: '45%' }}>
                <img 
                    src={masterLogo} 
                    alt="Logo" 
                    className="branding-visible" 
                    style={{ height: 50, width: 'auto', display: 'block', margin: 0, padding: 0 }} 
                />
                <div style={{ marginTop: '2px', textAlign: 'left' }}>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#003399', letterSpacing: '0.2px', lineHeight: 1.1 }}>
                        {title}
                    </div>
                    {/* Filter out unwanted text if matching MD TUHIN UPDATED, rendering other subtitles in a super clean, small professional font */}
                    {subtitle && !subtitle.toUpperCase().includes('TUHIN') && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 600, lineHeight: 1.3 }}>
                            {subtitle}
                        </div>
                    )}
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: 500 }}>
                        {t('generated', lang)}: {dayjs().format('DD MMM YYYY, hh:mm A')}
                    </div>
                </div>
            </div>

            {/* Right Side (Business Header): Strict right-alignment using flex-end column architecture to force every text element perfectly flush against the right edge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', maxWidth: '55%', margin: 0, padding: 0 }}>
                <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '0.2px', color: '#003399', lineHeight: 1, marginBottom: 4, marginTop: 0 }}>
                    Mamun Automobiles
                </div>
                {details.map((line) => (
                    <div key={line} style={{ fontSize: 13.5, color: '#003399', fontWeight: 600, lineHeight: 1.25, margin: 0, padding: 0 }}>
                        {line}
                    </div>
                ))}
            </div>
        </div>

        {/* Metadata section: Modern clean layout with light gray background and border */}
        {meta.length > 0 && (
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: 24,
                    background: '#f8fafc !important',
                    border: '1px solid #cbd5e1 !important',
                    WebkitPrintColorAdjust: 'exact',
                    borderRadius: 8,
                    padding: '12px 18px',
                    marginTop: 4
                }}
            >
                {meta.map((item, index) => (
                    <div key={`${item.label}-${item.value}`} style={{ fontSize: 15.5, color: '#0f172a', fontWeight: 600, borderRight: index < meta.length - 1 ? '1px solid #e2e8f0' : 'none', paddingRight: index < meta.length - 1 ? 24 : 0 }}>
                        <strong style={{ color: '#64748b', fontSize: 11.5, fontWeight: 600, marginRight: 6, letterSpacing: '0.2px' }}>{item.label}</strong> 
                        <span style={{ color: '#1e293b' }}>{item.value}</span>
                    </div>
                ))}
            </div>
        )}
    </div>
);

export default BrandedDocumentHeader;
