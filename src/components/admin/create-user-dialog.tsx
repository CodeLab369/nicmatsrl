'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { createUserSchema, CreateUserFormData } from '@/lib/validations';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, USER_ROLES } from '@/lib/constants';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      role: 'user',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      setIsSubmitting(true);

      // Verificar si el usuario ya existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', data.username)
        .single();

      if (existingUser) {
        toast({
          title: 'Error',
          description: 'El nombre de usuario ya está en uso',
          variant: 'destructive',
        });
        return;
      }

      // Crear usuario en Supabase Auth
      const email = `${data.username.toLowerCase()}@nicmat.local`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: data.password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        toast({
          title: 'Error',
          description: 'No se pudo crear el usuario en el sistema de autenticación',
          variant: 'destructive',
        });
        return;
      }

      // Crear usuario en la tabla users
      const { error: userError } = await supabase.from('users').insert({
        auth_id: authData.user?.id,
        username: data.username,
        full_name: data.fullName,
        role: data.role,
        is_active: true,
      });

      if (userError) {
        console.error('User error:', userError);
        toast({
          title: 'Error',
          description: 'No se pudo crear el perfil del usuario',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Éxito',
        description: SUCCESS_MESSAGES.CREATED,
        variant: 'success',
      });

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: ERROR_MESSAGES.GENERIC,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Complete los datos para crear un nuevo usuario en el sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre completo */}
          <div className="space-y-2">
            <Label htmlFor="fullName" required>
              Nombre Completo
            </Label>
            <Input
              id="fullName"
              placeholder="Ej: Juan Pérez"
              {...register('fullName')}
              error={errors.fullName?.message}
              disabled={isSubmitting}
            />
          </div>

          {/* Usuario */}
          <div className="space-y-2">
            <Label htmlFor="username" required>
              Usuario
            </Label>
            <Input
              id="username"
              placeholder="Ej: jperez"
              {...register('username')}
              error={errors.username?.message}
              disabled={isSubmitting}
            />
          </div>

          {/* Rol */}
          <div className="space-y-2">
            <Label htmlFor="role" required>
              Rol
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(value: 'admin' | 'user') => setValue('role', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger error={errors.role?.message}>
                <SelectValue placeholder="Seleccione un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USER_ROLES.ADMIN}>Administrador</SelectItem>
                <SelectItem value={USER_ROLES.USER}>Usuario</SelectItem>
              </SelectContent>
            </Select>
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
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
                {...register('password')}
                error={errors.password?.message}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" required>
              Confirmar Contraseña
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repita la contraseña"
                className="pr-10"
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Crear Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
