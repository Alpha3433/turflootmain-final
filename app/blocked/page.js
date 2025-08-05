'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldX, Home, Mail } from 'lucide-react'
import Link from 'next/link'

export default function BlockedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              TurfLoot is not available in your region due to local regulations. 
              We comply with all applicable laws and restrictions.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <h3 className="font-semibold mb-2">Restricted Regions:</h3>
              <p className="text-muted-foreground">
                Australia, United Kingdom, Belgium, Netherlands, Azerbaijan, 
                and certain US states (LA, MT, SD, TN, UT, WA).
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Return Home
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="flex-1">
                <a href="mailto:support@turfloot.com">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Support
                </a>
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground pt-4">
              If you believe this is an error, please contact our support team.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}