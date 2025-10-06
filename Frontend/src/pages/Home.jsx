import React, { useState } from 'react';
import { Tabs, Card } from 'antd';
import ExcelMediaUpload from '../components/ExcelMediaUpload';
import JobForm from '../components/JobForm';
import ProgressLog from '../components/ProgressLog';

export default function Home() {
    const [job, setJob] = useState(null);

    return (
        <Card>
            <Tabs
                defaultActiveKey="excelmedia"
                items={[
                    {
                        key: 'excelmedia',
                        label: 'Upload Excel + Media',
                        children: <ExcelMediaUpload onJobCreated={setJob} />,
                    },
                    {
                        key: 'manual',
                        label: 'Manual Entry',
                        children: <JobForm onJobCreated={setJob} />,
                    },
                ]}
            />
            <Card
                title="Job Progress"
                style={{ marginTop: 16 }}
                bodyStyle={{ maxHeight: 400, overflow: 'auto' }}
            >
                {job ? <ProgressLog jobId={job.jobId} /> : 'No job started yet.'}
            </Card>
        </Card>
    );
}
