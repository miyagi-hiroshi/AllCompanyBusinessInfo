import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
  isLoggingIn: boolean;
}

export function LoginForm({ onLogin, isLoggingIn }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onLogin(email, password);
    }
  };

  const handleDemoLogin = (demoType: "admin" | "user") => {
    if (demoType === "admin") {
      setEmail("admin@infolinx.com");
      setPassword("admin123");
    } else {
      setEmail("user@example.com");
      setPassword("password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">ログイン</CardTitle>
          <CardDescription className="text-center">
            認証情報を入力してログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={isLoggingIn}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                required
                disabled={isLoggingIn}
                autoComplete="current-password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoggingIn || !email || !password}
            >
              {isLoggingIn ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
          
          <div className="mt-6 space-y-2">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  デモログイン
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("admin")}
                disabled={isLoggingIn}
              >
                管理者としてログイン
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("user")}
                disabled={isLoggingIn}
              >
                一般ユーザーとしてログイン
              </Button>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>注意:</strong> この認証システムは既存システムと統合されています。
              実際の認証情報を使用してログインしてください。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
