import useSWR from 'swr';

export interface AnalyticsData {
    uniqueUsers: number;
    totalRequests: number;
    dailyData: Array<{ date: string; users: number; requests: number }>;
    weeklyData: Array<{ week: string; users: number; requests: number }>;
    monthlyData: Array<{ month: string; users: number; requests: number }>;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'An error occurred while fetching the data.');
    }
    return res.json();
};

export function useAnalytics(selectedApp: string, timeRange: string) {
    const { data, error, isLoading } = useSWR<AnalyticsData>(
        `/api/analytics?appId=${selectedApp}&timeRange=${timeRange}`,
        fetcher,
        {
            refreshInterval: 60000, // Refresh every minute
            revalidateOnFocus: true,
        }
    );

    return {
        data,
        error,
        isLoading,
    };
}
