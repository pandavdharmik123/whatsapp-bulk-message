import React, { useState } from 'react';
import { Upload, Table, Button, Space, message, Typography } from 'antd';
import { UploadOutlined, SendOutlined, FileExcelOutlined, FileImageOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import api from '../api';

const { Text } = Typography;

export default function ExcelMediaUpload({ onJobCreated }) {
    const [excelData, setExcelData] = useState([]);
    const [mediaFile, setMediaFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Parse Excel file
    const handleExcel = (info) => {
        const file = info.file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const wsname = workbook.SheetNames[0];
            const ws = workbook.Sheets[wsname];
            const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
            setExcelData(jsonData);
            message.success(`Loaded ${jsonData.length} rows from Excel`);
        };
        reader.readAsBinaryString(file);
    };

    const handleMedia = (info) => {
        console.log('info=', info);
        const file = info.file;
        console.log('file', file);
        setMediaFile(file);
        message.success(`Selected media file: ${file.name}`);
    };

    // Submit to backend
    const sendMessages = async () => {
        if (!excelData.length) return message.warning('Please upload an Excel file first.');
        if (!mediaFile) return message.warning('Please upload a media file.');

        try {
            setUploading(true);
            const formData = new FormData();

            // Add all Excel rows as items (Name, Phone, Message)
            const items = excelData.map((row, idx) => ({
                name: row.Name || '',
                phone: String(row.Phone).replace(/\D/g, ''),
                // caption: row.Message ? row.Message : `Hi ${row.Name || ''}`,
                message: row.Message ? row.Message : `Hi ${row.Name || ''}`,
                fileIndex: 0 // all use same file index 0
            }));
            formData.append('items', JSON.stringify(items));
            formData.append('files', mediaFile);

            const res = await api.post('/send-bulk', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            message.success(`Job queued: ${res.data.jobId}`);
            onJobCreated(res.data);
            setExcelData([]);
            setMediaFile(null);
        } catch (err) {
            console.error(err);
            message.error('Failed to send job');
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
                onChange={handleExcel}
            >
                <Button icon={<FileExcelOutlined />}>Upload Excel File</Button>
            </Upload>

            <Upload
                accept="image/*,video/*,.pdf"
                showUploadList={false}
                beforeUpload={() => false}
                onChange={handleMedia}
            >
                <Button icon={<FileImageOutlined />}>Upload Media File</Button>
            </Upload>

            {mediaFile && (
                <Text type="secondary">Selected file: {mediaFile.name}</Text>
            )}

            <Table
                dataSource={excelData}
                columns={columns}
                pagination={false}
                rowKey={(r, i) => i}
                size="small"
                style={{ marginTop: 10 }}
            />

            {excelData.length > 0 && mediaFile && (
                <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={uploading}
                    onClick={sendMessages}
                >
                    Send {excelData.length} Messages with "{mediaFile.name}"
                </Button>
            )}
        </Space>
    );
}
