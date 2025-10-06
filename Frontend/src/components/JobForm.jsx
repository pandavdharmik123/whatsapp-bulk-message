import React, { useState } from 'react';
import { Form, Input, Button, Upload, Table, Space, message } from 'antd';
import { UploadOutlined, SendOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../api';

export default function JobForm({ onJobCreated }) {
    const [items, setItems] = useState([]);
    const [uploading, setUploading] = useState(false);

    const addRow = () => {
        setItems([...items, { key: Date.now(), phone: '', caption: '', mediaUrl: '' }]);
    };

    const updateItem = (key, field, value) => {
        setItems(items.map(i => (i.key === key ? { ...i, [field]: value } : i)));
    };

    const removeRow = key => {
        setItems(items.filter(i => i.key !== key));
    };

    const submitJob = async () => {
        if (!items.length) {
            message.warning('Please add at least one recipient.');
            return;
        }
        try {
            setUploading(true);
            const payload = { jobName: 'Manual Job', items };
            const res = await api.post('/send-bulk', payload);
            message.success('Job queued successfully!');
            onJobCreated(res.data);
            setItems([]);
        } catch (err) {
            console.error(err);
            message.error('Failed to create job');
        } finally {
            setUploading(false);
        }
    };

    const columns = [
        { title: 'Phone', dataIndex: 'phone', render: (_, r) => (
                <Input value={r.phone} onChange={e => updateItem(r.key, 'phone', e.target.value)} placeholder="91XXXXXXXXXX" />
            )},
        { title: 'Caption', dataIndex: 'caption', render: (_, r) => (
                <Input value={r.caption} onChange={e => updateItem(r.key, 'caption', e.target.value)} placeholder="Message caption" />
            )},
        { title: 'Media URL', dataIndex: 'mediaUrl', render: (_, r) => (
                <Input value={r.mediaUrl} onChange={e => updateItem(r.key, 'mediaUrl', e.target.value)} placeholder="https://..." />
            )},
        {
            title: 'Action',
            render: (_, r) => (
                <Button danger onClick={() => removeRow(r.key)}>
                    Remove
                </Button>
            ),
        },
    ];

    return (
        <div>
            <Space direction="vertical" style={{ width: '100%' }}>
                <Button icon={<PlusOutlined />} onClick={addRow}>Add Recipient</Button>
                <Table dataSource={items} columns={columns} pagination={false} rowKey="key" />
                <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={uploading}
                    onClick={submitJob}
                >
                    Submit Job
                </Button>
            </Space>
        </div>
    );
}
