"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import { Badge } from '@/frontend/components/ui/badge';
import { Button } from '@/frontend/components/ui/button';
import { Progress } from '@/frontend/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { 
  MessageSquare, FileText, Clock, TrendingUp, Users, 
  Star, Search, Download, RefreshCw, Calendar,
  HelpCircle, BookOpen, Zap, Target
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalConversations: number;
    totalMessages: number;
    avgMessagesPerConversation: number;
    avgRating: number;
    faqSources: number;
    documentSources: number;
    avgResponseTime: number;
    activeUsers: number;
  };
  conversationTrends: Array<{
    date: string;
    conversations: number;
    messages: number;
  }>;
  sourceUsage: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  popularTopics: Array<{
    topic: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  userEngagement: Array<{
    timeSlot: string;
    users: number;
    messages: number;
  }>;
  responseMetrics: {
    avgResponseTime: number;
    fastResponses: number;
    mediumResponses: number;
    slowResponses: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchSentimentAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics?timeframe=${timeframe}`);
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSentimentAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics/sentiment?timeframe=${timeframe}`);
      const sentimentData = await response.json();
      setSentimentData(sentimentData);
    } catch (error) {
      console.error('Error fetching sentiment analytics:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p>No analytics data available</p>
              <Button onClick={fetchAnalytics} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const COLORS = ['#1a56db', '#7c3aed', '#059669', '#dc2626', '#ea580c'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Insights into your AI assistant's performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeframe} onValueChange={(value: 'day' | 'week' | 'month') => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalConversations}</div>
            <Badge variant="secondary" className="mt-1">
              {Math.round(data.overview.avgMessagesPerConversation)} avg/conv
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalMessages}</div>
            <Badge variant="secondary" className="mt-1">
              {data.overview.faqSources + data.overview.documentSources} sources
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.avgResponseTime}s</div>
            <Badge variant="secondary" className="mt-1">
              Performance
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.avgRating}/5</div>
            <Badge variant="secondary" className="mt-1">
              Satisfaction
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Conversation Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Conversation Trends</CardTitle>
                <p className="text-sm text-muted-foreground">Daily conversation and message volume</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.conversationTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="conversations" stroke="#1a56db" strokeWidth={2} />
                    <Line type="monotone" dataKey="messages" stroke="#7c3aed" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Source Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Source Usage</CardTitle>
                <p className="text-sm text-muted-foreground">Distribution of information sources</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.sourceUsage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.sourceUsage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4">
          {sentimentData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Sentiment Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Sentiment Distribution</CardTitle>
                  <p className="text-sm text-muted-foreground">Overall conversation sentiment</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Positive', value: sentimentData.overview.sentimentDistribution.positive, color: '#059669' },
                          { name: 'Neutral', value: sentimentData.overview.sentimentDistribution.neutral, color: '#6b7280' },
                          { name: 'Negative', value: sentimentData.overview.sentimentDistribution.negative, color: '#dc2626' }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Positive', value: sentimentData.overview.sentimentDistribution.positive, color: '#059669' },
                          { name: 'Neutral', value: sentimentData.overview.sentimentDistribution.neutral, color: '#6b7280' },
                          { name: 'Negative', value: sentimentData.overview.sentimentDistribution.negative, color: '#dc2626' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Customer Satisfaction */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Satisfaction</CardTitle>
                  <p className="text-sm text-muted-foreground">Overall satisfaction score</p>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {sentimentData.overview.averageSatisfaction}%
                    </div>
                    <Progress value={sentimentData.overview.averageSatisfaction} className="h-3 mb-2" />
                    <div className="text-sm text-muted-foreground">
                      Based on {sentimentData.overview.totalConversations} conversations
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p>Loading sentiment analysis...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
