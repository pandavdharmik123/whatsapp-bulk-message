import React, { useEffect, useState } from 'react';
import { Table, Tag } from 'antd';
import api from '../api';

export default function JobTable() {
    const [jobs, setJobs] = useState([]);

    const fetchJobs = async () => {
        const res = await api.get('/jobs');
        setJobs(res.data.reverse());
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const columns = [
        { title: 'Job Name', dataIndex: 'jobName' },
        { title: 'Job ID', dataIndex: 'id' },
        { title: 'Status', dataIndex: 'status', render: s => {
                const color = s === 'finished' ? 'green' : s === 'running' ? 'blue' : 'orange';
                return <Tag color={color}>{s}</Tag>;
            }},
        { title: 'Created', dataIndex: 'createdAt' },
        { title: 'Started', dataIndex: 'startedAt' },
        { title: 'Finished', dataIndex: 'finishedAt' },
    ];

    return <Table rowKey="id" dataSource={jobs} columns={columns} />;
}
