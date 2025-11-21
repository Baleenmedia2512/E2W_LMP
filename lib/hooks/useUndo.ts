import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';

interface UndoLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  previousState: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

export function useUndo() {
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [latestAction, setLatestAction] = useState<UndoLog | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const toast = useToast();

  // Fetch available undo actions
  const fetchUndoActions = useCallback(async () => {
    try {
      const res = await fetch('/api/undo');
      if (res.ok) {
        const data = await res.json();
        const actions = data.data || [];
        setLatestAction(actions[0] || null);
        setUndoAvailable(actions.length > 0);
      } else {
        setUndoAvailable(false);
        setLatestAction(null);
      }
    } catch (error) {
      console.error('Failed to fetch undo actions:', error);
      setUndoAvailable(false);
      setLatestAction(null);
    }
  }, []);

  // Perform undo
  const performUndo = useCallback(async () => {
    if (!undoAvailable || isUndoing) return;

    setIsUndoing(true);
    try {
      const res = await fetch('/api/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Action Reversed',
          description: `Successfully undid: ${formatActionName(data.data.action)}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'top',
        });

        // Refresh undo state
        await fetchUndoActions();

        // Trigger page refresh to show updated data
        window.dispatchEvent(new Event('undo-performed'));
        
        return true;
      } else {
        const error = await res.json();
        toast({
          title: 'Undo Failed',
          description: error.error || 'Could not undo action',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return false;
      }
    } catch (error) {
      console.error('Undo error:', error);
      toast({
        title: 'Undo Failed',
        description: 'An error occurred while undoing',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return false;
    } finally {
      setIsUndoing(false);
    }
  }, [undoAvailable, isUndoing, fetchUndoActions, toast]);

  // Format action names for display
  const formatActionName = (action: string): string => {
    const actionMap: Record<string, string> = {
      update_lead: 'Lead Update',
      delete_lead: 'Lead Deletion',
      assign_lead: 'Lead Assignment',
      update_status: 'Status Change',
      add_call: 'Call Log',
      schedule_followup: 'Follow-up Schedule',
    };
    return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Get time remaining for undo
  const getTimeRemaining = useCallback((): number => {
    if (!latestAction) return 0;
    const expiresAt = new Date(latestAction.expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((expiresAt - now) / 1000));
  }, [latestAction]);

  // Auto-refresh undo state every 5 seconds
  useEffect(() => {
    fetchUndoActions();
    const interval = setInterval(fetchUndoActions, 5000);
    return () => clearInterval(interval);
  }, [fetchUndoActions]);

  // Listen for new actions that should enable undo
  useEffect(() => {
    const handleUndoableAction = () => {
      fetchUndoActions();
    };

    window.addEventListener('undoable-action-created', handleUndoableAction);
    return () => window.removeEventListener('undoable-action-created', handleUndoableAction);
  }, [fetchUndoActions]);

  return {
    undoAvailable,
    latestAction,
    isUndoing,
    performUndo,
    getTimeRemaining,
    formatActionName: (action: string) => formatActionName(action),
    refresh: fetchUndoActions,
  };
}
