'use client';

import TakeQuizClient from './TakeQuizClient';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchQuizBundle, supabase, startQuizAttempt, saveQuizAnswer, submitQuizAttempt, fetchAnswersForAttempt, gradeAnswersBulk, updateAttemptScore } from '@/lib/supabase';

export const dynamic = 'force-static';

export default function TakeQuizPage() {
  return <TakeQuizClient />;
}
