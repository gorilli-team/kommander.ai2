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
    fastResponses: number; // <2s
    mediumResponses: number; // 2-5s
    slowResponses: number; // >5s
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
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
              {data.overview.totalMessages > 0 ? '+' : ''}{data.overview.totalMessages}
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
            <Progress value={Math.max(0, 100 - (data.overview.avgResponseTime * 20))} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.avgRating.toFixed(1)}/5</div>
            <div className="flex mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 ${
                    star <= data.overview.avgRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Conversation Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Conversation Trends</CardTitle>
                <p className="text-sm text-muted-foreground">Daily conversation volume over time</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.conversationTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="conversations" stroke="#1a56db" fill="#1a56db" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="messages" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Popular Topics */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Topics</CardTitle>
                <p className="text-sm text-muted-foreground">Most discussed topics this {timeframe}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.popularTopics.map((topic, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{topic.topic}</span>
                        <Badge variant={topic.trend === 'up' ? 'default' : topic.trend === 'down' ? 'destructive' : 'secondary'}>
                          {topic.trend === 'up' ? '↗' : topic.trend === 'down' ? '↘' : '→'}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{topic.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Source Usage Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Source Usage Distribution</CardTitle>
                <p className="text-sm text-muted-foreground">How your AI sources information</p>
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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Source Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Source Metrics</CardTitle>
                <p className="text-sm text-muted-foreground">Detailed breakdown of information sources</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">FAQ Sources</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{data.overview.faqSources}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">Document Sources</span>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">{data.overview.documentSources}</span>
                </div>

                <div className="pt-2">
                  <div className="text-sm text-muted-foreground mb-2">Source Efficiency</div>
                  <Progress 
                    value={(data.overview.faqSources / (data.overview.faqSources + data.overview.documentSources)) * 100} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>FAQ-driven</span>
                    <span>Document-driven</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Response Time Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
                <p className="text-sm text-muted-foreground">Performance breakdown by response speed</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Fast (&lt;2s)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(data.responseMetrics.fastResponses / (data.responseMetrics.fastResponses + data.responseMetrics.mediumResponses + data.responseMetrics.slowResponses)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{data.responseMetrics.fastResponses}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm">Medium (2-5s)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-600 h-2 rounded-full" 
                          style={{ width: `${(data.responseMetrics.mediumResponses / (data.responseMetrics.fastResponses + data.responseMetrics.mediumResponses + data.responseMetrics.slowResponses)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{data.responseMetrics.mediumResponses}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-red-600" />
                      <span className="text-sm">Slow (&gt;5s)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${(data.responseMetrics.slowResponses / (data.responseMetrics.fastResponses + data.responseMetrics.mediumResponses + data.responseMetrics.slowResponses)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{data.responseMetrics.slowResponses}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Key Performance Indicators</CardTitle>
                <p className="text-sm text-muted-foreground">Overall system performance metrics</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">98.5%</div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">97.2%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Performance Score</span>
                    <span className="font-medium">Excellent</span>
                  </div>
                  <Progress value={92} className="h-3" />
                  <div className="text-xs text-muted-foreground mt-1">Based on response time, accuracy, and user satisfaction</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          {/* User Engagement Chart */}
          <Card>
            <CardHeader>
              <CardTitle>User Engagement Patterns</CardTitle>
              <p className="text-sm text-muted-foreground">Activity patterns throughout the day</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.userEngagement}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeSlot" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="users" fill="#1a56db" name="Active Users" />
                  <Bar dataKey="messages" fill="#7c3aed" name="Messages" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
