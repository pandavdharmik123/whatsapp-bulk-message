import React from 'react';
import { Card } from 'antd';
import JobTable from '../components/JobTable';

export default function Jobs() {
    return (
        <Card title="Job History">
            <JobTable />
        </Card>
    );
}
