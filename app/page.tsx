import Link from "next/link";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Users, Bot, Zap } from "lucide-react";
import { UserProfileCard } from "../components/user-profile-card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">HireAI</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="#features"
              className="text-gray-600 hover:text-gray-900"
            >
              Features
            </Link>
            <Link href="#about" className="text-gray-600 hover:text-gray-900">
              About
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI-Powered Recruitment
            <span className="text-blue-600"> Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Connect job seekers with recruiters using advanced AI matching.
            Upload your resume, find perfect job matches, and streamline your
            hiring process.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-3">
              <Link href="/signup">Start Your Journey</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-8 py-3 bg-transparent"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Meet Our Top Talent
          </h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Discover skilled professionals ready to join your team. Our AI
            matches you with candidates who fit your exact requirements.
          </p>
          <div className="flex justify-center">
            <UserProfileCard />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose HireAI?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-6 w-6 text-blue-600" />
                  AI-Powered Matching
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Our advanced AI analyzes resumes and job descriptions to find
                  perfect matches, saving time for both job seekers and
                  recruiters.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-blue-600" />
                  For Everyone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Whether you're a job seeker looking for opportunities or a
                  recruiter finding talent, HireAI has tools designed for your
                  success.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-6 w-6 text-blue-600" />
                  Lightning Fast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get instant resume analysis, job recommendations, and
                  candidate matches. No more waiting weeks for the perfect
                  opportunity.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Transform Your Career or Hiring Process?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of job seekers and recruiters who trust HireAI for
            their career success.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="text-lg px-8 py-3"
          >
            <Link href="/signup">Get Started Today</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Bot className="h-6 w-6" />
            <span className="text-xl font-bold">HireAI</span>
          </div>
          <p className="text-gray-400 mb-4">
            AI-powered recruitment platform connecting talent with opportunity.
          </p>
          <div className="flex justify-center space-x-6">
            <Link href="/login" className="text-gray-400 hover:text-white">
              Login
            </Link>
            <Link href="/signup" className="text-gray-400 hover:text-white">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
