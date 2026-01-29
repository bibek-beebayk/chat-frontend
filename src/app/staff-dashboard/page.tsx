import { Suspense } from 'react';
import ChatPage from '../chat/page';

export default function StaffDashboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ChatPage />
        </Suspense>
    );
}
