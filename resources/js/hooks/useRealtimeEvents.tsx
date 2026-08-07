import { useEffect, useState, useCallback, useMemo } from 'react';
import echo from '@/echo';

interface TaskStatusEvent {
    task_id: number;
    status: string;
    project_id: number;
}

interface SubTaskStatusEvent {
    sub_task_id: number;
    task_id: number;
    status: string;
    title: string;
}

export function useRealtimeEvents(projectId?: number) {
    const [taskStatus, setTaskStatus] = useState<Record<number, string>>({});
    const [subTaskStatus, setSubTaskStatus] = useState<Record<number, string>>({});

    const handleTaskStatusChanged = useCallback((event: TaskStatusEvent) => {
        setTaskStatus(prev => ({ ...prev, [event.task_id]: event.status }));
    }, []);

    const handleSubTaskStatusChanged = useCallback((event: SubTaskStatusEvent) => {
        setSubTaskStatus(prev => ({ ...prev, [event.sub_task_id]: event.status }));
    }, []);

    useEffect(() => {
        if (!projectId) return;

        const channel = echo.private(`project.${projectId}`);

        channel.listen('task.status.changed', handleTaskStatusChanged);
        channel.listen('sub_task.status.changed', handleSubTaskStatusChanged);

        return () => {
            channel.stopListening('task.status.changed', handleTaskStatusChanged);
            channel.stopListening('sub_task.status.changed', handleSubTaskStatusChanged);
        };
    }, [projectId, handleTaskStatusChanged, handleSubTaskStatusChanged]);

    return {
        taskStatus,
        subTaskStatus,
    };
}

export function useRealtimeMultiEvents(projectIds: number[]) {
    const [taskStatus, setTaskStatus] = useState<Record<number, string>>({});
    const [subTaskStatus, setSubTaskStatus] = useState<Record<number, string>>({});

    const handleTaskStatusChanged = useCallback((event: TaskStatusEvent) => {
        setTaskStatus(prev => ({ ...prev, [event.task_id]: event.status }));
    }, []);

    const handleSubTaskStatusChanged = useCallback((event: SubTaskStatusEvent) => {
        setSubTaskStatus(prev => ({ ...prev, [event.sub_task_id]: event.status }));
    }, []);

    useEffect(() => {
        if (projectIds.length === 0) return;

        const channels = projectIds.map(id => echo.private(`project.${id}`));

        channels.forEach(channel => {
            channel.listen('task.status.changed', handleTaskStatusChanged);
            channel.listen('sub_task.status.changed', handleSubTaskStatusChanged);
        });

        return () => {
            channels.forEach(channel => {
                channel.stopListening('task.status.changed', handleTaskStatusChanged);
                channel.stopListening('sub_task.status.changed', handleSubTaskStatusChanged);
            });
        };
    }, [projectIds, handleTaskStatusChanged, handleSubTaskStatusChanged]);

    return {
        taskStatus,
        subTaskStatus,
    };
}