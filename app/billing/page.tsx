'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Badge } from '@/frontend/components/ui/badge';
import { Progress } from '@/frontend/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs';
import { 
  CheckCircle, Crown, Zap, Star, CreditCard, Download, 
  TrendingUp, Calendar, Users, MessageSquare 
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  isPopular?: boolean;
  isCurrentPlan?: boolean;
}

interface UsageData {
  conversations: { used: number; limit: number };
  messages: { used: number; limit: number };
  analytics: { used: number; limit: number };
}

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
}

export default function BillingPage() {
  const { data: session } = useSession();
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: [
        '50 conversazioni/mese',
        'Analytics di base',
        'Supporto via email',
        'Template standard'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 29,
      features: [
        '1.000 conversazioni/mese',
        'Analytics avanzate',
        'Supporto prioritario',
        'Template personalizzati',
        'Accesso API'
      ],
      isPopular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99,
      features: [
        'Conversazioni illimitate',
        'Analytics personalizzate',
        'Supporto dedicato',
        'Soluzione white-label',
        'Integrazioni personalizzate',
        'Garanzia SLA'
      ]
    }
  ];

  useEffect(() => {
    if (session?.user?.id) {
      fetchBillingData();
    }
  }, [session]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      
      // Fetch current subscription
      const planResponse = await fetch('/api/billing/subscription');
      const planData = await planResponse.json();
      setCurrentPlan(planData.plan || subscriptionPlans[0]);

      // Fetch usage data
      const usageResponse = await fetch('/api/billing/usage');
      const usageData = await usageResponse.json();
      setUsage(usageData || {
        conversations: { used: 23, limit: 50 },
        messages: { used: 156, limit: 500 },
        analytics: { used: 8, limit: 10 }
      });

      // Fetch billing history
      const historyResponse = await fetch('/api/billing/history');
      const historyData = await historyResponse.json();
      setBillingHistory(historyData || [
        {
          id: '1',
          date: '2024-01-01',
          amount: 29,
          status: 'paid',
          description: 'Pro Plan - Monthly'
        },
        {
          id: '2',
          date: '2023-12-01',
          amount: 29,
          status: 'paid',
          description: 'Pro Plan - Monthly'
        }
      ]);

    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      
      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Accesso Richiesto</CardTitle>
            <CardDescription>
              Devi effettuare l'accesso per visualizzare le informazioni di billing
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento dati billing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-4">
            <CreditCard className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fatturazione e Abbonamenti</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Gestisci il tuo piano di abbonamento, monitora l'utilizzo e visualizza la cronologia fatturazione
          </p>
        </div>

        {/* Current Plan & Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Piano Attuale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <h3 className="text-2xl font-bold">{currentPlan?.name}</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {currentPlan?.price === 0 ? 'Gratuito' : `€${currentPlan?.price}/mese`}
                </p>
              </div>
              <div className="space-y-2">
                {currentPlan?.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              {currentPlan?.id === 'free' && (
                  <Button 
                    onClick={() => handleUpgrade('pro')} 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Passa a Pro
                  </Button>
              )}
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Utilizzo Attuale
              </CardTitle>
              <CardDescription>Monitora il tuo utilizzo mensile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {usage && (
                <>
                  {/* Conversations */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Conversazioni</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {usage.conversations.used} / {usage.conversations.limit}
                      </span>
                    </div>
                    <Progress 
                      value={(usage.conversations.used / usage.conversations.limit) * 100} 
                      className="h-2"
                    />
                  </div>

                  {/* Messages */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Messaggi</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {usage.messages.used} / {usage.messages.limit}
                      </span>
                    </div>
                    <Progress 
                      value={(usage.messages.used / usage.messages.limit) * 100} 
                      className="h-2"
                    />
                  </div>

                  {/* Analytics Exports */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Export Analytics</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {usage.analytics.used} / {usage.analytics.limit}
                      </span>
                    </div>
                    <Progress 
                      value={(usage.analytics.used / usage.analytics.limit) * 100} 
                      className="h-2"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plans">Piani</TabsTrigger>
            <TabsTrigger value="history">Cronologia</TabsTrigger>
            <TabsTrigger value="usage">Utilizzo Dettagliato</TabsTrigger>
          </TabsList>

          {/* Subscription Plans */}
          <TabsContent value="plans" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subscriptionPlans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative hover:shadow-xl transition-all duration-300 ${
                    plan.isPopular ? 'border-blue-500 shadow-lg' : ''
                  } ${
                    currentPlan?.id === plan.id ? 'ring-2 ring-green-500' : ''
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-600 text-white px-3 py-1">
                        <Star className="w-3 h-3 mr-1" />
                        Più Popolare
                      </Badge>
                    </div>
                  )}
                  
                  {currentPlan?.id === plan.id && (
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-green-600 text-white px-3 py-1">
                        Piano Attuale
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="space-y-2">
                      <div className="text-4xl font-bold">
                        {plan.price === 0 ? 'Gratuito' : `€${plan.price}`}
                      </div>
                      {plan.price > 0 && (
                        <div className="text-sm text-gray-500">/mese</div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4">
                      {currentPlan?.id === plan.id ? (
                        <Button disabled className="w-full">
                          Piano Attuale
                        </Button>
                      ) : currentPlan?.id === 'free' && plan.id !== 'free' ? (
                        <Button 
                          onClick={() => handleUpgrade(plan.id)}
                          className={`w-full ${
                            plan.isPopular 
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                              : ''
                          }`}
                        >
                          Passa a questo piano
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          onClick={() => handleUpgrade(plan.id)}
                          className="w-full"
                        >
                          Cambia Piano
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Billing History */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Cronologia Fatturazione
                </CardTitle>
                <CardDescription>
                  Visualizza tutte le tue transazioni e fatture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billingHistory.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${
                          transaction.status === 'paid' ? 'bg-green-500' : 
                          transaction.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(transaction.date).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">€{transaction.amount}</div>
                        <Badge variant={
                          transaction.status === 'paid' ? 'default' : 
                          transaction.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {transaction.status === 'paid' ? 'Pagato' : 
                           transaction.status === 'pending' ? 'In attesa' : 'Fallito'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {billingHistory.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nessuna transazione disponibile
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Detailed Usage */}
          <TabsContent value="usage" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    Conversazioni
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{usage?.conversations.used}</div>
                      <div className="text-sm text-gray-500">di {usage?.conversations.limit} utilizzate</div>
                    </div>
                    <Progress value={(usage?.conversations.used || 0) / (usage?.conversations.limit || 1) * 100} />
                    <div className="text-xs text-gray-500">
                      Si resetta il 1° di ogni mese
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-500" />
                    Utenti Attivi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">147</div>
                      <div className="text-sm text-gray-500">questo mese</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      +23% rispetto al mese scorso
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-purple-500" />
                    Export Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">{usage?.analytics.used}</div>
                      <div className="text-sm text-gray-500">di {usage?.analytics.limit} utilizzati</div>
                    </div>
                    <Progress value={(usage?.analytics.used || 0) / (usage?.analytics.limit || 1) * 100} />
                    <div className="text-xs text-gray-500">
                      Export CSV e PDF disponibili
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
