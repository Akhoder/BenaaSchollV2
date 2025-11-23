'use client';

import GradeQuizClient from './GradeQuizClient';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { fetchQuizBundle, fetchAttemptsWithAnswers, supabase, updateAnswerGrade, recalcAttemptScore, updateAnswerPayload } from '@/lib/supabase';

export const dynamic = 'force-static';

export default function GradeQuizPage() {
  return <GradeQuizClient />;
}
