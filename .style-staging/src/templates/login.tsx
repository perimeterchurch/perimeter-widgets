"use client";

import { Button } from "@registry/ui/perimeter/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@registry/ui/perimeter/card";
import { Checkbox } from "@registry/ui/perimeter/checkbox";
import { Input } from "@registry/ui/perimeter/input";
import { Label } from "@registry/ui/perimeter/label";

export const meta = {
  name: "Login",
  description:
    "Centered login card with email and password fields, remember me toggle, and social sign-in.",
  components: ["card", "input", "label", "button", "checkbox"],
};

export default function LoginTemplate() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo and heading */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            P
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your Perimeter Church account
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="name@perimeter.org"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm font-normal">
                Remember me for 30 days
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button className="w-full">Sign in</Button>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  or continue with
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Sign in with Microsoft
            </Button>
          </CardFooter>
        </Card>

        {/* Footer text */}
        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <button type="button" className="text-primary hover:underline">
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
