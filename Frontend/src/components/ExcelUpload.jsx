import React, { useState } from 'react';
import { Upload, Table, Button, message, Space } from 'antd';
import { UploadOutlined, SendOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import api from '../api';

export default function ExcelUpload({ onJobCreated }) {
    const [data, setData] = useState([]);
    const [uploading, setUploading] = useState(false);

    // Parse Excel file
    const handleUpload = (info) => {
        const file = info.file.originFileObj;
        const reader = new FileReader();
        reader.onload = (e) => {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const wsname = workbook.SheetNames[0];
            const ws = workbook.Sheets[wsname];
            const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
            setData(jsonData);
            message.success(`Loaded ${jsonData.length} rows from Excel`);
        };
        reader.readAsBinaryString(file);
    };

    // Send bulk job
    const sendMessages = async () => {
        if (!data.length) {
            message.warning('Upload an Excel file first.');
            return;
        }

        // Each row should have {Name, Phone, Message}
        const items = data.map((row) => ({
            phone: String(row.Phone).replace(/\D/g, ''),
            caption: row.Message || `Hi ${row.Name}, how are you?`
        }));

        try {
            setUploading(true);
            const res = await api.post('/send-bulk', { jobName: 'ExcelJob', items });
            message.success('Job queued successfully!');
            onJobCreated(res.data);
            setData([]);
        } catch (err) {
            console.error(err);
            message.error('Failed to create job');
        } finally {
            setUploading(false);
        }
    };

    const columns = [
        { title: 'Name', dataIndex: 'Name' },
        { title: 'Phone', dataIndex: 'Phone' },
        { title: 'Message', dataIndex: 'Message' },
    ];

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            <Upload
                accept=".xlsx,.xls"
                showUploadList={false}
                beforeUpload={() => false}
                onChange={handleUpload}
            >
                <Button icon={<UploadOutlined />}>Upload Excel File</Button>
            </Upload>

            <Table
                dataSource={data}
                columns={columns}
                pagination={false}
                rowKey={(r, i) => i}
                size="small"
            />

            {data.length > 0 && (
                <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={uploading}
                    onClick={sendMessages}
                >
                    Send {data.length} Messages
                </Button>
            )}
        </Space>
    );
}
