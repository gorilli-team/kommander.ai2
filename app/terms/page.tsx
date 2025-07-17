import { generatePageMetadata } from '@/frontend/lib/metadata';

export const metadata = generatePageMetadata({
  title: 'Terms of Service',
  description: 'Read our Terms of Service to understand the legal agreement between you and Kommander.ai. Learn about user responsibilities, prohibited activities, and payment terms.',
  url: '/terms',
  noIndex: false,
});

"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Separator } from '@/frontend/components/ui/separator';
import { Badge } from '@/frontend/components/ui/badge';
import { FileText, Clock, Scale, Shield, AlertTriangle, Gavel } from 'lucide-react';

export default function TermsOfServicePage() {
  const lastUpdated = "December 10, 2024";
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Last updated: {lastUpdated}</span>
          <Badge variant="secondary" className="ml-2">Legal Agreement</Badge>
        </div>
      </div>

      <div className="space-y-8">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Agreement to Terms
            </CardTitle>
            <CardDescription>
              By accessing and using Kommander.ai, you agree to be bound by these Terms of Service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              These Terms of Service ("Terms", "Agreement") are a legal agreement between you ("User", "you") and Kommander.ai ("we", "us", "our") regarding your use of our AI-powered chatbot platform and related services.
            </p>
          </CardContent>
        </Card>

        {/* Service Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Service Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Kommander.ai provides AI-powered chatbot services that enable businesses to create, deploy, and manage intelligent conversational agents. Our services include:
            </p>
            
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>AI chatbot creation and customization tools</li>
              <li>Natural language processing capabilities</li>
              <li>Integration with third-party platforms</li>
              <li>Analytics and reporting features</li>
              <li>Customer support and maintenance</li>
            </ul>
          </CardContent>
        </Card>

        {/* User Responsibilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              User Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Account Security</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Use strong passwords and enable two-factor authentication when available</li>
                <li>You are responsible for all activities under your account</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">Acceptable Use</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Use our services only for lawful purposes</li>
                <li>Respect intellectual property rights</li>
                <li>Do not attempt to reverse engineer our software</li>
                <li>Do not use our services to harm others or violate their rights</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">Content Guidelines</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>You retain ownership of content you provide to our services</li>
                <li>Content must not violate applicable laws or regulations</li>
                <li>Content must not infringe on third-party rights</li>
                <li>We reserve the right to remove inappropriate content</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Prohibited Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Prohibited Activities
            </CardTitle>
            <CardDescription>
              The following activities are strictly prohibited when using our services:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium text-red-600">Security Violations</h5>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    <li>Attempting to breach security measures</li>
                    <li>Accessing unauthorized data or systems</li>
                    <li>Distributing malware or viruses</li>
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-red-600">Abuse and Harassment</h5>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    <li>Harassing other users or staff</li>
                    <li>Posting offensive or discriminatory content</li>
                    <li>Spamming or sending unsolicited messages</li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium text-red-600">Legal Violations</h5>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    <li>Copyright or trademark infringement</li>
                    <li>Illegal activities or content</li>
                    <li>Violation of privacy laws</li>
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-red-600">Service Abuse</h5>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    <li>Excessive use that impacts performance</li>
                    <li>Circumventing usage limits</li>
                    <li>Reselling without authorization</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Payment Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Subscription Plans</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Subscription fees are billed in advance on a recurring basis</li>
                <li>All fees are non-refundable except as required by law</li>
                <li>We may change pricing with 30 days' notice</li>
                <li>You can cancel your subscription at any time</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Payment Processing</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Payments are processed by secure third-party providers</li>
                <li>You authorize us to charge your payment method</li>
                <li>Failed payments may result in service suspension</li>
                <li>Taxes are your responsibility unless otherwise stated</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Intellectual Property
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Our Rights</h4>
              <p className="text-sm text-muted-foreground">
                Kommander.ai and its licensors own all rights, title, and interest in our services, including all intellectual property rights. This includes our software, algorithms, designs, and trademarks.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Your Rights</h4>
              <p className="text-sm text-muted-foreground">
                You retain ownership of content you create using our services. By using our services, you grant us a license to use your content solely to provide our services to you.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">License to Use</h4>
              <p className="text-sm text-muted-foreground">
                We grant you a limited, non-exclusive, non-transferable license to use our services in accordance with these Terms. This license terminates when your account is closed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Limitation of Liability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">Important Legal Notice</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Our services are provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Service Availability</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>We strive for high availability but cannot guarantee 100% uptime</li>
                <li>Scheduled maintenance may temporarily interrupt services</li>
                <li>We are not liable for losses due to service interruptions</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">AI-Generated Content</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>AI responses may not always be accurate or appropriate</li>
                <li>You are responsible for reviewing and validating AI-generated content</li>
                <li>We are not liable for decisions made based on AI outputs</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Termination
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Termination by You</h4>
              <p className="text-sm text-muted-foreground">
                You may terminate your account at any time by following the cancellation process in your account settings. Termination will be effective at the end of your current billing period.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Termination by Us</h4>
              <p className="text-sm text-muted-foreground">
                We may suspend or terminate your account if you violate these Terms, fail to pay fees, or for any other reason with appropriate notice as required by law.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Effect of Termination</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Your access to our services will be discontinued</li>
                <li>We may delete your data after a reasonable retention period</li>
                <li>Surviving provisions will remain in effect</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contact and Legal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Questions About These Terms</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  If you have questions about these Terms of Service, please contact us:
                </p>
                <div className="space-y-1 text-sm">
                  <div><strong>Email:</strong> legal@kommander.ai</div>
                  <div><strong>Address:</strong> Kommander.ai Legal Team, [Your Address]</div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-2">Changes to Terms</h4>
                <p className="text-sm text-muted-foreground">
                  We may update these Terms from time to time. We will notify you of significant changes by email or through our service. Continued use after changes constitutes acceptance of the new terms.
                </p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-2">Governing Law</h4>
                <p className="text-sm text-muted-foreground">
                  These Terms are governed by the laws of [Your Jurisdiction]. Any disputes will be resolved in the courts of [Your Jurisdiction].
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
