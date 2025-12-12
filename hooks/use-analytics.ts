"use client"

import { useState, useEffect } from "react"

export interface AnalyticsData {
    uniqueUsers: number
    totalRequests: number
    dailyData: Array<{ date: string; users: number; requests: number }>
    weeklyData: Array<{ week: string; users: number; requests: number }>
    monthlyData: Array<{ month: string; users: number; requests: number }>
}

export function useAnalytics(selectedApp: string, timeRange: string) {
    const [data, setData] = useState<AnalyticsData>({
        uniqueUsers: 0,
        totalRequests: 0,
        dailyData: [],
        weeklyData: [],
        monthlyData: [],
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const response = await fetch(`/api/analytics?appId=${selectedApp}&timeRange=${timeRange}`)
                const apiData = await response.json()

                if (response.ok) {
                    setData(apiData)
                } else {
                    setError(apiData.error || "An error occurred fetching analytics data")
                    console.error("API error:", apiData.error)
                }
            } catch (err) {
                setError("Failed to fetch analytics data")
                console.error("Fetch error:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [selectedApp, timeRange])

    return { data, isLoading, error }
}
