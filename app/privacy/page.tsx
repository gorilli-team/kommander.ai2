"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Separator } from '@/frontend/components/ui/separator';
import { Badge } from '@/frontend/components/ui/badge';
import { Shield, Mail, Clock, Database, Cookie, Eye, Lock, FileText } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const lastUpdated = "December 10, 2024";
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Last updated: {lastUpdated}</span>
          <Badge variant="secondary" className="ml-2">GDPR Compliant</Badge>
        </div>
      </div>

      <div className="space-y-8">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Your Privacy Matters
            </CardTitle>
            <CardDescription>
              At Kommander.ai, we are committed to protecting your privacy and ensuring transparency about how we collect, use, and protect your personal information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This Privacy Policy explains how Kommander.ai ("we," "our," or "us") collects, uses, discloses, and safeguards your information when you use our AI-powered chatbot platform. Please read this privacy policy carefully.
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Personal Information</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Name and email address (when you create an account)</li>
                <li>Profile information you choose to provide</li>
                <li>Payment information (processed securely by third-party providers)</li>
                <li>Communication preferences and consent records</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">Usage Information</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Conversations and interactions with our AI chatbots</li>
                <li>Usage patterns and preferences</li>
                <li>Device information and IP addresses</li>
                <li>Browser type and operating system</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">Automatically Collected Information</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Log files and analytics data</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Performance metrics and error reports</li>
                <li>Security logs and fraud prevention data</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Service Provision</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Provide, operate, and maintain our AI chatbot services</li>
                  <li>Process your requests and deliver personalized responses</li>
                  <li>Manage your account and provide customer support</li>
                  <li>Process payments and manage subscriptions</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Improvement and Analytics</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Analyze usage patterns to improve our services</li>
                  <li>Develop new features and functionality</li>
                  <li>Conduct research and analytics (anonymized data)</li>
                  <li>Monitor and ensure system security and performance</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Communication</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Send you important updates about our services</li>
                  <li>Respond to your inquiries and provide support</li>
                  <li>Send marketing communications (with your consent)</li>
                  <li>Notify you about changes to our policies</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cookies and Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Cookies and Tracking Technologies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We use cookies and similar tracking technologies to enhance your experience and collect information about how you use our services.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium mb-2">Necessary Cookies</h5>
                  <p className="text-xs text-muted-foreground">
                    Essential for the website to function properly. These cannot be disabled.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium mb-2">Analytics Cookies</h5>
                  <p className="text-xs text-muted-foreground">
                    Help us understand how visitors interact with our website.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium mb-2">Functional Cookies</h5>
                  <p className="text-xs text-muted-foreground">
                    Enable enhanced functionality and personalization.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium mb-2">Marketing Cookies</h5>
                  <p className="text-xs text-muted-foreground">
                    Used to track visitors and display relevant ads.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights (GDPR) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Your Rights Under GDPR
            </CardTitle>
            <CardDescription>
              As a data subject, you have several rights regarding your personal information:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium">Right to Access</h5>
                  <p className="text-xs text-muted-foreground">
                    Request a copy of the personal data we hold about you.
                  </p>
                </div>
                
                <div>
                  <h5 className="font-medium">Right to Rectification</h5>
                  <p className="text-xs text-muted-foreground">
                    Request correction of inaccurate or incomplete data.
                  </p>
                </div>
                
                <div>
                  <h5 className="font-medium">Right to Erasure</h5>
                  <p className="text-xs text-muted-foreground">
                    Request deletion of your personal data ("right to be forgotten").
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium">Right to Portability</h5>
                  <p className="text-xs text-muted-foreground">
                    Request a copy of your data in a machine-readable format.
                  </p>
                </div>
                
                <div>
                  <h5 className="font-medium">Right to Restrict Processing</h5>
                  <p className="text-xs text-muted-foreground">
                    Request limitation of how we process your data.
                  </p>
                </div>
                
                <div>
                  <h5 className="font-medium">Right to Object</h5>
                  <p className="text-xs text-muted-foreground">
                    Object to the processing of your personal data.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Lock className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h5 className="font-medium mb-1">Encryption</h5>
                <p className="text-xs text-muted-foreground">
                  Data encrypted in transit and at rest
                </p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h5 className="font-medium mb-1">Access Control</h5>
                <p className="text-xs text-muted-foreground">
                  Strict access controls and authentication
                </p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Eye className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h5 className="font-medium mb-1">Monitoring</h5>
                <p className="text-xs text-muted-foreground">
                  Continuous security monitoring
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us:
            </p>
            
            <div className="space-y-2 text-sm">
              <div>
                <strong>Email:</strong> privacy@kommander.ai
              </div>
              <div>
                <strong>Data Protection Officer:</strong> dpo@kommander.ai
              </div>
              <div>
                <strong>Address:</strong> Kommander.ai Privacy Team, [Your Address]
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              We will respond to your requests within 30 days as required by GDPR.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
