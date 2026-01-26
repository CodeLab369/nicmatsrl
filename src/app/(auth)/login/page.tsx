'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Battery, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts';
import { useToast } from '@/hooks/use-toast';
import { loginSchema, LoginFormData } from '@/lib/validations';
import { COMPANY, ROUTES, SUCCESS_MESSAGES } from '@/lib/constants';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/components/ui';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(ROUTES.DASHBOARD);
    }
  }, [isLoading, isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    const result = await login(data.username, data.password);

    if (result.success) {
      toast({
        title: '¡Bienvenido!',
        description: SUCCESS_MESSAGES.LOGIN,
        variant: 'success',
      });
      router.push(ROUTES.DASHBOARD);
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl animate-fade-in">
      <CardHeader className="text-center space-y-4">
        {/* Logo */}
        <div className="mx-auto w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
          <Battery className="w-12 h-12 text-primary-foreground" />
        </div>
        
        <div className="space-y-2">
          <CardTitle className="text-2xl font-bold text-primary">
            {COMPANY.name}
          </CardTitle>
          <CardDescription className="text-base">
            Sistema de Gestión de Inventario y Cotizaciones
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Usuario */}
          <div className="space-y-2">
            <Label htmlFor="username" required>
              Usuario
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Ingrese su usuario"
              autoComplete="username"
              autoFocus
              {...register('username')}
              error={errors.username?.message}
              disabled={isSubmitting}
            />
          </div>

          {/* Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="password" required>
              Contraseña
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingrese su contraseña"
                autoComplete="current-password"
                className="pr-10"
                {...register('password')}
                error={errors.password?.message}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                </span>
              </button>
            </div>
          </div>

          {/* Botón de inicio de sesión */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isSubmitting}
          >
            {!isSubmitting && <LogIn className="mr-2 h-4 w-4" />}
            Iniciar Sesión
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            {COMPANY.name} &copy; {new Date().getFullYear()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {COMPANY.description} - {COMPANY.country}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
