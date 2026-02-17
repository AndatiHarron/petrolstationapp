import { useContext } from 'react';
import { TutorialContext } from '@/components/tutorial/tutorial-provider';

export function useTutorial() {
    const ctx = useContext(TutorialContext);
    if (!ctx) {
        throw new Error('useTutorial must be used within TutorialProvider');
    }
    return ctx;
}

