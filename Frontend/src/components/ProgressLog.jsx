import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { List, Tag } from 'antd';

export default function ProgressLog({ jobId }) {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        if (!jobId) return;
        const socket = io(import.meta.env.VITE_API_URL);
        socket.emit('subscribe', jobId);
        socket.on(`job:${jobId}`, evt => {
            setEvents(prev => [evt, ...prev]);
        });
        return () => socket.disconnect();
    }, [jobId]);

    return (
        <List
            size="small"
            bordered
            dataSource={events}
            renderItem={(item) => (
                <List.Item>
                    <Tag color={item.status === 'sent' ? 'green' : item.status === 'failed' ? 'red' : 'blue'}>
                        {item.type}
                    </Tag>
                    {item.phone ? ` ${item.phone}` : ''}
                    {item.error ? ` → ${item.error}` : ''}
                </List.Item>
            )}
        />
    );
}
