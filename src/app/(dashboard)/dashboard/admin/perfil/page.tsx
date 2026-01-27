'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, User, Lock, Save } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts';
import { useToast } from '@/hooks/use-toast';
import {
  updateProfileSchema,
  changePasswordSchema,
  UpdateProfileFormData,
  ChangePasswordFormData,
} from '@/lib/validations';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Badge,
} from '@/components/ui';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Estado para mostrar contraseñas
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Formulario de perfil
  const profileForm = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      username: user?.username || '',
      fullName: user?.fullName || '',
    },
  });

  // Formulario de contraseña
  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  // Actualizar perfil
  const onUpdateProfile = async (data: UpdateProfileFormData) => {
    if (!user) return;

    try {
      setIsUpdatingProfile(true);

      // Verificar si el username ya está en uso
      if (data.username !== user.username) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', data.username)
          .neq('id', user.id)
          .single();

        if (existingUser) {
          toast({
            title: 'Error',
            description: 'El nombre de usuario ya está en uso',
            variant: 'destructive',
          });
          return;
        }
      }

      // Actualizar en la base de datos
      const { error } = await supabase
        .from('users')
        .update({
          username: data.username,
          full_name: data.fullName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshUser();

      toast({
        title: 'Éxito',
        description: SUCCESS_MESSAGES.UPDATED,
        variant: 'success',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: ERROR_MESSAGES.GENERIC,
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Cambiar contraseña
  const onChangePassword = async (data: ChangePasswordFormData) => {
    try {
      setIsUpdatingPassword(true);

      // Verificar contraseña actual autenticando de nuevo
      const email = `${user?.username.toLowerCase()}@nicmat.local`;
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: data.currentPassword,
      });

      if (authError) {
        toast({
          title: 'Error',
          description: 'La contraseña actual es incorrecta',
          variant: 'destructive',
        });
        return;
      }

      // Actualizar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;

      passwordForm.reset();

      toast({
        title: 'Éxito',
        description: 'La contraseña ha sido actualizada',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: ERROR_MESSAGES.GENERIC,
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Gestiona tu información personal y contraseña
        </p>
      </div>

      {/* Información actual */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Información de la Cuenta
          </CardTitle>
          <CardDescription>
            Resumen de tu cuenta en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Usuario</p>
              <p className="font-medium">{user.username}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Rol</p>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {user.role === 'admin' ? 'Administrador' : 'Usuario'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Nombre Completo</p>
              <p className="font-medium">{user.fullName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Último Acceso</p>
              <p className="font-medium">
                {user.lastLogin ? formatDateTime(user.lastLogin) : 'Primera sesión'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editar perfil */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Editar Perfil
          </CardTitle>
          <CardDescription>
            Actualiza tu nombre de usuario y nombre completo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-username" required>
                  Usuario
                </Label>
                <Input
                  id="profile-username"
                  placeholder="Ej: nestor"
                  {...profileForm.register('username')}
                  error={profileForm.formState.errors.username?.message}
                  disabled={isUpdatingProfile}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-fullName" required>
                  Nombre Completo
                </Label>
                <Input
                  id="profile-fullName"
                  placeholder="Ej: Nestor Tarqui"
                  {...profileForm.register('fullName')}
                  error={profileForm.formState.errors.fullName?.message}
                  disabled={isUpdatingProfile}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={isUpdatingProfile}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Cambiar contraseña */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>
            Actualiza tu contraseña de acceso al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
            {/* Contraseña actual */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" required>
                Contraseña Actual
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Ingrese su contraseña actual"
                  className="pr-10"
                  {...passwordForm.register('currentPassword')}
                  error={passwordForm.formState.errors.currentPassword?.message}
                  disabled={isUpdatingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nueva contraseña */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" required>
                  Nueva Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-10"
                    {...passwordForm.register('newPassword')}
                    error={passwordForm.formState.errors.newPassword?.message}
                    disabled={isUpdatingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar nueva contraseña */}
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword" required>
                  Confirmar Nueva Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="confirmNewPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repita la nueva contraseña"
                    className="pr-10"
                    {...passwordForm.register('confirmNewPassword')}
                    error={passwordForm.formState.errors.confirmNewPassword?.message}
                    disabled={isUpdatingPassword}
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
            </div>

            <div className="flex justify-end">
              <Button type="submit" isLoading={isUpdatingPassword}>
                <Lock className="mr-2 h-4 w-4" />
                Cambiar Contraseña
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
