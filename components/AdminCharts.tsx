'use client';

import { useEffect, useState } from 'react';
import { ChartCard } from './Charts';
import { Skeleton } from './ui/skeleton';
import { getStudentGrowthData, getClassDistributionData, getAttendanceTrendsData } from '@/lib/optimizedQueries';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from './ui/card';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminCharts() {
  const { language } = useLanguage();
  const [studentGrowth, setStudentGrowth] = useState<any[]>([]);
  const [classDistribution, setClassDistribution] = useState<any[]>([]);
  const [attendanceTrends, setAttendanceTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChartsData = async () => {
      try {
        setLoading(true);
        
        // ✅ PERFORMANCE: Load all charts data in parallel
        const [growthResult, distributionResult, attendanceResult] = await Promise.all([
          getStudentGrowthData(),
          getClassDistributionData(),
          getAttendanceTrendsData()
        ]);
        
        if (growthResult.data) setStudentGrowth(growthResult.data);
        if (distributionResult.data) setClassDistribution(distributionResult.data);
        if (attendanceResult.data) setAttendanceTrends(attendanceResult.data);
      } catch (err) {
        console.error('Error loading charts data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadChartsData();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card-hover border-0 shadow-xl p-6">
            <Skeleton className="h-6 w-40 mb-6" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </Card>
        ))}
      </div>
    );
  }

  if (studentGrowth.length === 0 && classDistribution.length === 0 && attendanceTrends.length === 0) {
    return (
      <Card className="glass-card-hover border-0 shadow-xl p-12">
        <div className="text-center">
          <div className="inline-flex p-4 bg-muted/50 rounded-2xl mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {language === 'ar' ? 'لا توجد بيانات متاحة للرسوم البيانية' : 'No chart data available'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {studentGrowth.length > 0 && (
          <div className="animate-fade-in-up">
            <ChartCard
              title={language === 'ar' ? 'نمو عدد الطلاب' : 'Student Growth'}
              data={studentGrowth}
              type="line"
            />
          </div>
        )}
        {classDistribution.length > 0 && (
          <div className="animate-fade-in-up delay-100">
            <ChartCard
              title={language === 'ar' ? 'توزيع الفصول' : 'Class Distribution'}
              data={classDistribution}
              type="pie"
            />
          </div>
        )}
      </div>
      {attendanceTrends.length > 0 && (
        <div className="animate-fade-in-up delay-200">
          <ChartCard
            title={language === 'ar' ? 'معدل الحضور' : 'Attendance Trends'}
            data={attendanceTrends}
            type="bar"
          />
        </div>
      )}
    </div>
  );
}
