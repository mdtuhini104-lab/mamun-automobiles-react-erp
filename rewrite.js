import fs from 'fs';

const filePath = 'd:/App/mamun-react-erp-standalone/src/JobIntakePage.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace CSS
const oldCss = `.dashboard-page {
                background: #ffffff !important;
                color: #1e293b !important;
            }`;

const newCss = `.dashboard-page {
                background: #ffffff !important;
                color: #1e293b !important;
            }
            .job-intake-workspace {
                display: grid !important;
                grid-template-columns: 1.2fr 1fr !important;
                gap: 28px !important;
                align-items: start !important;
                width: 100% !important;
                margin-top: 20px !important;
            }
            @media (max-width: 992px) {
                .job-intake-workspace {
                    grid-template-columns: 1fr !important;
                }
            }`;

content = content.replace(oldCss, newCss);

// Replace layout
const startMarker = '<div className="checkin-desk-grid">';
const endMarker = '</div>\n            </div>\n\n            <Modal';
const startIndex = content.lastIndexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const oldLayout = content.substring(startIndex, endIndex);
    
    const newLayout = `<div className="job-intake-workspace">
                <Card style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: 0 }} bordered={false}>
                    <Title level={4} style={{ color: '#003399', fontWeight: 700, marginBottom: 24, paddingBottom: 10 }}>{t('new_registration', lang)}</Title>
                    <Form form={form} layout="vertical" onFinish={handleSubmitIntake}>
                        
                        <Divider orientation="left" style={{ borderColor: '#e2e8f0', color: '#64748b', fontSize: 12, fontWeight: 700, marginTop: 0 }}>I. CUSTOMER INTEL</Divider>
                        
                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item name="vehicleNo" label={<Text style={{ color: '#003399', fontWeight: 700, fontSize: 13, letterSpacing: '0.5px' }}>{t('vehicle_registration_number', lang)}</Text>}>
                                    <AutoComplete 
                                        className="glass-input"
                                        options={customerVehiclesOptions.length > 0 ? customerVehiclesOptions : allVehiclesOptions}
                                        placeholder="DHAKA METRO-XX-00-0000" 
                                        allowClear
                                        onSelect={(val) => handleVehicleLookup(val)}
                                        onBlur={(e) => handleVehicleLookup(e.target.value)}
                                        filterOption={(inputValue, option) =>
                                            option && option.value && String(option.value).toLowerCase().indexOf(String(inputValue || '').toLowerCase()) !== -1
                                        }
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="customerName" label={<Text style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 }}>{t('customer_company_name', lang)}</Text>}>
                                    <AutoComplete 
                                        className="glass-input"
                                        options={unifiedClientOptions}
                                        placeholder={t('type_customer_name', lang)}
                                        onSearch={handleCustomerSearch}
                                        onSelect={(val, option) => handleClientSelect(val, option)}
                                        filterOption={(inputValue, option) =>
                                            option && option.value && String(option.value).toLowerCase().indexOf(String(inputValue || '').toLowerCase()) !== -1
                                        }
                                        onChange={(val) => handleCustomerNameChange(val)}
                                        notFoundContent={searching ? <div style={{ textAlign: 'center', padding: '8px' }}><Spin size="small" /> Searching...</div> : null}
                                    >
                                        <Input 
                                            className="glass-input"
                                            autoComplete="off"
                                            allowClear
                                            suffix={searching ? <Spin size="small" /> : null}
                                        />
                                    </AutoComplete>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item name="phone" label={<Text style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 }}>{t('contact_phone', lang)}</Text>}>
                                    <Input 
                                        className="glass-input"
                                        placeholder="01777888999" 
                                        allowClear 
                                        onBlur={async (e) => {
                                            const phone = e.target.value;
                                            if (phone && phone.length >= 10 && !form.getFieldValue('customerName')) {
                                                try {
                                                    const relData = await databaseBridge.fetchCustomerRelationalData(phone);
                                                    if (relData) {
                                                        form.setFieldsValue({
                                                            customerName: relData.customerName || '',
                                                            address: relData.address || ''
                                                        });
                                                        if (relData.vehicles && relData.vehicles.length > 0) {
                                                            setCustomerVehiclesOptions(relData.vehicles.map(v => ({ value: v.toUpperCase() })));
                                                        }
                                                    }
                                                } catch (err) {
                                                    console.error('[JobIntake] Phone relational lookup failed:', err);
                                                }
                                            }
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="address" label={<Text style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 }}>{lang === 'bn' ? 'ঠিকানা' : 'Address'}</Text>}>
                                    <Input className="glass-input" placeholder={lang === 'bn' ? 'ঠিকানা লিখুন...' : 'Enter address...'} allowClear />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider orientation="left" style={{ borderColor: '#e2e8f0', color: '#64748b', fontSize: 12, fontWeight: 700, marginTop: 10 }}>II. VEHICLE DIAGNOSTICS</Divider>

                        <Row gutter={24}>
                            <Col span={24}>
                                <Form.Item name="mechanicId" label={<Text style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 }}>{t('assign_specialist', lang)}</Text>}>
                                    <Select 
                                        className="glass-input force-black-text"
                                        showSearch
                                        optionFilterProp="children"
                                        placeholder={lang === 'bn' ? 'বিশেষজ্ঞ নির্বাচন করুন...' : "Select luxury car specialist..."} 
                                        style={{ width: '100%' }}
                                        dropdownStyle={{ backgroundColor: '#ffffff', color: '#000000' }}
                                        loading={loadingMechanics}
                                    >
                                        {mechanics.map(m => (
                                            <Option key={m.id} value={m.id}>
                                                <span style={{ color: '#000000' }}>
                                                    {m.name || ""} [{m.department || "General"}]
                                                </span>
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                                <Form.Item name="complaints" style={{ margin: 0 }} label={<Text style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 }}>{t('customer_complaint', lang)}</Text>}>
                                    <SmartVoiceInput 
                                        className="glass-input"
                                        isTextArea 
                                        rows={3} 
                                        autoRefine 
                                        placeholder={lang === 'bn' ? 'কাস্টমারের অভিযোগ লিখুন...' : 'Enter customer complaints...'} 
                                        onBlur={(e) => handleBlurCorrection('complaints', e.target.value, 'notes')}
                                    />
                                </Form.Item>
                            </div>
                            <Tooltip title={lang === 'bn' ? 'এআই দিয়ে সংশোধন করুন' : 'Refine with AI'}>
                                <Button 
                                    icon={<Sparkles size={16} />} 
                                    onClick={async () => {
                                         const current = form.getFieldValue('complaints');
                                         if (current) {
                                             const refined = await enhanceAutomotiveText(current, vehicleContext);
                                             form.setFieldsValue({ complaints: refined });
                                         }
                                     }}
                                    style={{ height: '45px', background: 'rgba(0, 51, 153, 0.05)', border: '1px solid rgba(0, 51, 153, 0.2)', color: '#003399', marginTop: '29px' }}
                                />
                            </Tooltip>
                        </div>

                        <Button
                            type="primary"
                            size="large"
                            block
                            htmlType="submit"
                            loading={submitting}
                            className="btn-commit-service"
                            style={{ height: 55, fontSize: 14, fontWeight: 700, backgroundColor: '#003399', border: 'none', borderRadius: '8px', marginTop: 20, color: '#ffffff', letterSpacing: '0.2px' }}
                        >
                            {t('commit_to_service', lang)}
                        </Button>
                    </Form>
                </Card>

                <Card style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: 0 }} bordered={false}>
                    <Title level={4} style={{ color: '#003399', fontWeight: 700, marginBottom: 24, paddingBottom: 10 }}>{t('current_operations_queue', lang)}</Title>
                    { (intakes || []).length === 0 ? (
                        <Empty description={<Text style={{ color: '#64748b', fontWeight: 600 }}>{t('no_vehicles_in_queue', lang)}</Text>} />
                    ) : (
                        <div style={{ display: 'grid', gap: 16 }}>
                            {intakes.filter(Boolean).map(intake => (
                                <div key={intake.id} style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: '#003399', letterSpacing: '0.2px' }}>{intake.vehicleNo}</div>
                                            <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 700, marginTop: 4 }}>{intake.customerName || (lang === 'bn' ? 'নামহীন গ্রাহক' : 'Anonymous Client')}</div>
                                        </div>
                                        <Tag style={{ background: intake.status === 'Ready' ? '#e0f2fe' : '#eff6ff', color: intake.status === 'Ready' ? '#0369a1' : '#1e40af', border: intake.status === 'Ready' ? '1px solid #bae6fd' : '1px solid #bfdbfe', borderRadius: '6px', fontWeight: 700, fontSize: 11, padding: '2px 8px' }}>
                                            {t(intake.status?.toLowerCase() || 'pending', lang)}
                                        </Tag>
                                    </div>
                                    <div style={{ display: 'flex', gap: 20, marginBottom: 15 }}>
                                        <div>
                                            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase' }}>Specialist</div>
                                            <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{mechanics.find(m => m.id === intake.mechanicId)?.name || 'Unassigned'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase' }}>Diagnostics</div>
                                            <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{(intake.items || []).length} Findings</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'nowrap', alignItems: 'center' }}>
                                        <Button size="small" type="primary" onClick={() => handleEditIntake(intake)} style={{ flex: 1, backgroundColor: '#003399', color: '#ffffff', fontWeight: 700, borderRadius: '6px', border: 'none', fontSize: 11, height: '32px' }}>{t('analyze', lang)}</Button>
                                        
                                        <Button size="small" type="primary" onClick={() => handleSendToJobCard(intake)} style={{ flex: 1, backgroundColor: '#003399', color: '#ffffff', fontWeight: 700, borderRadius: '6px', border: 'none', fontSize: 11, height: '32px' }}>{lang === 'bn' ? 'জব কার্ড তৈরি করুন' : 'Generate Job Card'}</Button>

                                        {intake.status === 'Ready' && (
                                            <Button size="small" type="primary" onClick={() => handleSendToQuotation(intake)} style={{ flex: 1, backgroundColor: '#003399', color: '#ffffff', fontWeight: 700, borderRadius: '6px', border: 'none', fontSize: 11, height: '32px' }}>{t('proceed_to_quote', lang)}</Button>
                                        )}
                                        {intake.status === 'Inspecting' && (
                                            <Button size="small" type="primary" onClick={() => handleMarkReady(intake.id)} style={{ flex: 1, backgroundColor: '#003399', color: '#ffffff', fontWeight: 700, borderRadius: '6px', border: 'none', fontSize: 11, height: '32px' }}>{t('complete_inspection', lang)}</Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>`;

    content = content.replace(oldLayout, newLayout);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Rewrite complete.");
} else {
    console.log("Could not find layout boundaries.");
    console.log("start: ", startIndex);
    console.log("end: ", endIndex);
}
