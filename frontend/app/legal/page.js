'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Shield, Eye, Scale } from 'lucide-react'
import Link from 'next/link'

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex items-center space-x-2">
              <Scale className="w-5 h-5 text-[#14F195]" />
              <span className="font-bold">Legal Information</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-sm">
                <Scale className="w-4 h-4 mr-2" />
                Terms & Conditions
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-sm">
                <Eye className="w-4 h-4 mr-2" />
                Privacy Policy
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-sm">
                <Shield className="w-4 h-4 mr-2" />
                Responsible Gaming
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Terms & Conditions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Scale className="w-5 h-5 mr-2 text-[#14F195]" />
              Terms & Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <div className="space-y-6 text-sm">
              <div>
                <h3 className="font-bold text-[#14F195] mb-2">1. Age Verification & Eligibility</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  By accessing and using TurfLoot, you represent and warrant that:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>You are at least 18 years of age or the age of majority in your jurisdiction</li>
                  <li>You have the legal capacity to enter into binding agreements</li>
                  <li>Your participation in skill-based gaming is legal in your jurisdiction</li>
                  <li>You are not located in a restricted territory (see Section 3)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-[#14F195] mb-2">2. Skill-Based Gaming</h3>
                <p className="text-muted-foreground leading-relaxed">
                  TurfLoot is a skill-based gaming platform where outcomes are determined solely by player skill, strategy, and decision-making. 
                  No element of chance or luck determines the results. Players compete in real-time territory capture games where success 
                  depends on movement strategy, territory management, and tactical decision-making.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#14F195] mb-2">3. Geographic Restrictions</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  TurfLoot services are not available to residents of the following jurisdictions:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Australia, United Kingdom, Belgium, Netherlands, Azerbaijan</li>
                  <li>US States: Louisiana, Montana, South Dakota, Tennessee, Utah, Washington</li>
                  <li>Any jurisdiction where skill-based gaming for prizes is prohibited</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-[#14F195] mb-2">4. Account Registration & Verification</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Account creation requires connection of a Solana wallet. We may request additional verification documents 
                  to confirm identity and age. False information provided during registration will result in account termination.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#14F195] mb-2">5. Game Rules & Fair Play</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All games are monitored for fair play. Use of automated tools, bots, or exploits is strictly prohibited. 
                  TurfLoot reserves the right to void games and confiscate winnings from accounts engaged in unfair play.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#14F195] mb-2">6. Financial Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  A 10% service fee is deducted from gross winnings. Minimum withdrawal amounts may apply. 
                  All transactions are processed in SOL cryptocurrency on the Solana blockchain.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#14F195] mb-2">7. Limitation of Liability</h3>
                <p className="text-muted-foreground leading-relaxed">
                  TurfLoot's liability is limited to the amount of funds held in your account. We are not responsible for 
                  losses due to blockchain network issues, wallet security breaches, or market volatility.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Policy */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2 text-[#14F195]" />
              Privacy Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <div className="space-y-6 text-sm">
              <div>
                <h3 className="font-bold text-[#14F195] mb-2">Information We Collect</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Wallet addresses and transaction data for gaming activities</li>
                  <li>IP addresses and geographic location for compliance verification</li>
                  <li>Age verification information as required by law</li>
                  <li>Game performance data and statistics</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-[#14F195] mb-2">How We Use Information</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Personal information is used exclusively for account verification, compliance with applicable laws, 
                  fraud prevention, and improving our services. We do not sell personal data to third parties.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#14F195] mb-2">Age Verification</h3>
                <p className="text-muted-foreground leading-relaxed">
                  By using TurfLoot, you confirm that you meet the minimum age requirements. We may request 
                  age verification documents and will terminate accounts of underage users immediately upon discovery.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#14F195] mb-2">Data Security</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We implement industry-standard security measures to protect user data. However, no online service 
                  can guarantee complete security. Users are responsible for wallet security and private key management.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responsible Gaming */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-[#14F195]" />
              Responsible Gaming
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <div className="space-y-6 text-sm">
              <div>
                <h3 className="font-bold text-[#14F195] mb-2">Age Requirement</h3>
                <p className="text-muted-foreground leading-relaxed">
                  TurfLoot is restricted to users who are 18 years of age or older. By using our platform, 
                  you confirm that you meet this age requirement and that skill-based gaming is legal in your jurisdiction.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#14F195] mb-2">Play Responsibly</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Set time and spending limits before playing</li>
                  <li>Never play with funds you cannot afford to lose</li>
                  <li>Take regular breaks during gaming sessions</li>
                  <li>Seek help if gaming becomes problematic</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-[#14F195] mb-2">Support Resources</h3>
                <p className="text-muted-foreground leading-relaxed">
                  If you or someone you know has a gaming problem, help is available:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>National Council on Problem Gambling: 1-800-522-4700</li>
                  <li>Gamblers Anonymous: www.gamblersanonymous.org</li>
                  <li>National Suicide Prevention Lifeline: 988</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-[#14F195] mb-2">Account Controls</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Users can request account suspension or closure at any time by contacting support@turfloot.com. 
                  We will process such requests within 24 hours and provide withdrawal of remaining funds.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            Questions about these policies? Contact us at{' '}
            <a href="mailto:legal@turfloot.com" className="text-[#14F195] hover:underline">
              legal@turfloot.com
            </a>
          </p>
          <p className="text-muted-foreground text-xs mt-2">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}