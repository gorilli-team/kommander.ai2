'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Badge } from '@/frontend/components/ui/badge';
import { Progress } from '@/frontend/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  BarChart3,
  PieChart,
  Lightbulb,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';

interface CostSummary {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  averageCostPerRequest: number;
  averageTokensPerRequest: number;
  mostExpensiveRequest: number;
  period: { start: string; end: string };
  breakdown: {
    byModel: Record<string, { cost: number; requests: number; tokens: number }>;
    byDay: Array<{ date: string; cost: number; requests: number }>;
    byHour: Array<{ hour: number; cost: number; requests: number }>;
  };
}

interface ClientAnalysis {
  topClients: Array<{ clientId: string; totalCost: number; totalRequests: number }>;
  detailedAnalyses: Array<{
    clientId: string;
    totalCost: number;
    totalRequests: number;
    monthlyProjection: number;
    riskLevel: 'low' | 'medium' | 'high';
    trends: { costTrend: string; usageTrend: string };
    suggestedPlan: string;
  }>;
  summary: {
    totalClients: number;
    totalCost: number;
    averageCostPerClient: number;
    highRiskClients: number;
    mediumRiskClients: number;
    lowRiskClients: number;
  };
}

interface BusinessInsight {
  type: 'opportunity' | 'warning' | 'optimization' | 'growth';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionItems: string[];
  estimatedROI?: string;
}

interface PricingRecommendation {
  recommendedPlan: string;
  suggestedPrice: number;
  reasoning: string;
  marketAnalysis: string;
  profitMargin: number;
  riskAssessment: string;
  recommendations: string[];
}

const AdminDashboard = () => {
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [clientAnalysis, setClientAnalysis] = useState<ClientAnalysis | null>(null);
  const [businessInsights, setBusinessInsights] = useState<BusinessInsight[]>([]);
  const [pricingRecommendations, setPricingRecommendations] = useState<PricingRecommendation[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<any>(null);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const adminHeaders = { 'x-admin-secret': 'admin-k2m4x9-secret' };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch cost summary
      const costResponse = await fetch('/api/admin/cost-summary', {
        headers: adminHeaders
      });
      if (!costResponse.ok) throw new Error('Failed to fetch cost summary');
      const costData = await costResponse.json();
      setCostSummary(costData.data);

      // Fetch client analysis
      const clientResponse = await fetch('/api/admin/client-analysis', {
        headers: adminHeaders
      });
      if (!clientResponse.ok) throw new Error('Failed to fetch client analysis');
      const clientData = await clientResponse.json();
      setClientAnalysis(clientData.data);

      // Fetch business insights
      const insightsResponse = await fetch('/api/admin/business-advisor?action=insights', {
        headers: adminHeaders
      });
      if (!insightsResponse.ok) throw new Error('Failed to fetch insights');
      const insightsData = await insightsResponse.json();
      setBusinessInsights(insightsData.data.insights || []);

      // Fetch pricing recommendations
      const pricingResponse = await fetch('/api/admin/business-advisor?action=pricing', {
        headers: adminHeaders
      });
      if (!pricingResponse.ok) throw new Error('Failed to fetch pricing');
      const pricingData = await pricingResponse.json();
      setPricingRecommendations(pricingData.data.recommendations || []);

      // Fetch market analysis
      const marketResponse = await fetch('/api/admin/business-advisor?action=market', {
        headers: adminHeaders
      });
      if (!marketResponse.ok) throw new Error('Failed to fetch market analysis');
      const marketData = await marketResponse.json();
      setMarketAnalysis(marketData.data);

      // Fetch optimization suggestions
      const optimizationResponse = await fetch('/api/admin/business-advisor?action=optimization', {
        headers: adminHeaders
      });
      if (!optimizationResponse.ok) throw new Error('Failed to fetch optimization');
      const optimizationData = await optimizationResponse.json();
      setOptimizationSuggestions(optimizationData.data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'optimization': return <Settings className="h-4 w-4" />;
      case 'growth': return <Target className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Caricamento dashboard admin...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Errore</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🔒 Admin Dashboard</h1>
            <p className="text-gray-600">Monitoraggio costi, analytics e business intelligence</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Aggiorna
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Esporta Report
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Costo Totale</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${costSummary?.totalCost.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground">
                Ultimi 30 giorni
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clienti Attivi</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientAnalysis?.summary.totalClients || 0}</div>
              <p className="text-xs text-muted-foreground">
                Top spenders monitorati
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Costo Medio</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${costSummary?.averageCostPerRequest.toFixed(4) || '0.0000'}
              </div>
              <p className="text-xs text-muted-foreground">
                Per richiesta API
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Richieste Totali</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{costSummary?.totalRequests.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                API calls processate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clienti</TabsTrigger>
            <TabsTrigger value="apikeys">API Keys</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="pricing">Pricing AI</TabsTrigger>
            <TabsTrigger value="market">Market Analysis</TabsTrigger>
            <TabsTrigger value="optimization">Ottimizzazione</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cost Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Breakdown Costi per Modello</CardTitle>
                </CardHeader>
                <CardContent>
                  {costSummary?.breakdown.byModel && Object.entries(costSummary.breakdown.byModel).map(([model, data]) => (
                    <div key={model} className="flex justify-between items-center py-2">
                      <span className="font-medium">{model}</span>
                      <div className="text-right">
                        <div className="font-bold">${data.cost.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{data.requests} richieste</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Risk Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuzione Rischio Clienti</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Alto Rischio</span>
                    </div>
                    <span className="font-bold">{clientAnalysis?.summary.highRiskClients || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Medio Rischio</span>
                    </div>
                    <span className="font-bold">{clientAnalysis?.summary.mediumRiskClients || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Basso Rischio</span>
                    </div>
                    <span className="font-bold">{clientAnalysis?.summary.lowRiskClients || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Clienti per Spesa</CardTitle>
                <CardDescription>
                  Clienti con maggiore consumo API negli ultimi 30 giorni
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientAnalysis?.detailedAnalyses.slice(0, 10).map((client, index) => (
                    <div key={client.clientId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">
                            {client.clientEmail || client.clientId || 'Cliente Enterprise'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {client.companyName && <span>{client.companyName} • </span>}
                            {client.totalRequests} richieste
                            {client.sector && <span> • {client.sector}</span>}
                            {client.planType && <span> • Piano {client.planType}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-x-2">
                        <Badge className={getRiskColor(client.riskLevel)}>
                          {client.riskLevel}
                        </Badge>
                        <div className="font-bold">€{client.monthlyProjection.toFixed(2)}/mese</div>
                        <div className="text-sm text-gray-500">{client.suggestedPlan}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apikeys" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* API Usage Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>OpenAI API</span>
                  </CardTitle>
                  <CardDescription>Utilizzo ultimo mese</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Costo Totale:</span>
                      <span className="font-bold">${costSummary?.totalCost.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Token Utilizzati:</span>
                      <span className="font-bold">{costSummary?.totalTokens.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Richieste:</span>
                      <span className="font-bold">{costSummary?.totalRequests.toLocaleString() || '0'}</span>
                    </div>
                    <Progress value={75} className="mt-2" />
                    <p className="text-xs text-gray-500">75% del limite mensile</p>
                  </div>
                </CardContent>
              </Card>

              {/* Cost per Model */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuzione Modelli</CardTitle>
                  <CardDescription>Costi per modello AI</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {costSummary?.breakdown.byModel && Object.entries(costSummary.breakdown.byModel)
                      .sort(([,a], [,b]) => b.cost - a.cost)
                      .slice(0, 5)
                      .map(([model, data]) => (
                      <div key={model} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">{model}</div>
                          <div className="text-xs text-gray-500">{data.requests} richieste</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${data.cost.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">
                            {data.tokens ? `${(data.tokens/1000).toFixed(1)}K tokens` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* API Health Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Stato API</CardTitle>
                  <CardDescription>Monitoraggio real-time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">OpenAI API</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Operativo</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Rate Limiting</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Normale</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">Latenza Media</span>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">245ms</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Andamento Utilizzo API</CardTitle>
                <CardDescription>Costi e richieste negli ultimi 30 giorni</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {costSummary?.breakdown.byDay?.slice(-7).map((day, index) => (
                      <div key={index} className="space-y-2">
                        <div className="text-xs text-gray-500">
                          {new Date(day.date).toLocaleDateString('it-IT', { weekday: 'short' })}
                        </div>
                        <div className="relative">
                          <div 
                            className="bg-blue-200 rounded-sm mx-auto"
                            style={{ 
                              width: '20px', 
                              height: `${Math.max(4, (day.cost / Math.max(...(costSummary?.breakdown.byDay?.map(d => d.cost) || [1]))) * 60)}px` 
                            }}
                          ></div>
                        </div>
                        <div className="text-xs font-medium">${day.cost.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">{day.requests} req</div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          ${costSummary?.averageCostPerRequest.toFixed(4) || '0.0000'}
                        </div>
                        <div className="text-xs text-gray-500">Costo Medio/Richiesta</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {costSummary?.averageTokensPerRequest.toFixed(0) || '0'}
                        </div>
                        <div className="text-xs text-gray-500">Token Medi/Richiesta</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          ${costSummary?.mostExpensiveRequest.toFixed(4) || '0.0000'}
                        </div>
                        <div className="text-xs text-gray-500">Richiesta Più Costosa</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Keys Management */}
            <Card>
              <CardHeader>
                <CardTitle>Gestione API Keys</CardTitle>
                <CardDescription>Configurazione e monitoraggio chiavi API</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="font-medium">OpenAI Production Key</div>
                        <div className="text-sm text-gray-500">sk-****...****1234 • Creata il 15 Gen 2024</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-100 text-green-800">Attiva</Badge>
                      <Button variant="outline" size="sm">Gestisci</Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="font-medium">OpenAI Development Key</div>
                        <div className="text-sm text-gray-500">sk-****...****5678 • Creata il 10 Gen 2024</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-blue-100 text-blue-800">Test</Badge>
                      <Button variant="outline" size="sm">Gestisci</Button>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Raccomandazioni di Sicurezza</h4>
                        <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                          <li>• Ruota le API keys ogni 90 giorni</li>
                          <li>• Monitora utilizzo anomalo o picchi di costo</li>
                          <li>• Configura alert per superamento soglie</li>
                          <li>• Usa environment separati per dev/prod</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {businessInsights.map((insight, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getInsightIcon(insight.type)}
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                      </div>
                      <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}>
                        {insight.impact} impact
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4">{insight.description}</p>
                    <div>
                      <h4 className="font-medium mb-2">Azioni Consigliate:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {insight.actionItems.map((action, actionIndex) => (
                          <li key={actionIndex} className="text-sm text-gray-600">{action}</li>
                        ))}
                      </ul>
                    </div>
                    {insight.estimatedROI && (
                      <div className="mt-3 p-2 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium text-green-800">
                          ROI Stimato: {insight.estimatedROI}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pricingRecommendations.map((rec, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{rec.recommendedPlan}</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${rec.suggestedPrice}/mese
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Margine: {(rec.profitMargin * 100).toFixed(1)}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Reasoning:</h4>
                      <p className="text-sm text-gray-600">{rec.reasoning}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Market Analysis:</h4>
                      <p className="text-sm text-gray-600">{rec.marketAnalysis}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Raccomandazioni:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {rec.recommendations.map((recommendation, recIndex) => (
                          <li key={recIndex} className="text-sm text-gray-600">{recommendation}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="market" className="space-y-4">
            {marketAnalysis && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Analisi di Mercato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium">Prezzo Medio Industria:</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        ${marketAnalysis.averageIndustryPrice}/mese
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Strategia di Posizionamento:</h4>
                      <p className="text-sm text-gray-600">{marketAnalysis.positioningRecommendation}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Strategia Pricing:</h4>
                      <p className="text-sm text-gray-600">{marketAnalysis.pricingStrategy}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Vantaggi Competitivi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {marketAnalysis.competitiveAdvantages.map((advantage: string, index: number) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{advantage}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Trend di Mercato:</h4>
                      <ul className="space-y-1">
                        {marketAnalysis.marketTrends.map((trend: string, index: number) => (
                          <li key={index} className="text-sm text-gray-600">• {trend}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4">
            {optimizationSuggestions && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Suggerimenti di Ottimizzazione</span>
                      <span className="text-lg font-bold text-green-600">
                        Risparmio Potenziale: ${optimizationSuggestions.potentialSavings.toFixed(2)}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Basato sui costi attuali di ${optimizationSuggestions.currentCosts.total.toFixed(2)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {optimizationSuggestions.suggestions.map((suggestion: string, index: number) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                          <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                          <span className="text-sm">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Statistiche Attuali</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">${optimizationSuggestions.currentCosts.total.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">Costo Totale</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">${optimizationSuggestions.currentCosts.averagePerRequest.toFixed(4)}</div>
                        <div className="text-sm text-gray-500">Media per Richiesta</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{optimizationSuggestions.currentCosts.totalRequests.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">Richieste Totali</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
