'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts';
import { updateUserSchema, UpdateUserFormData } from '@/lib/validations';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, USER_ROLES } from '@/lib/constants';
import { User } from '@/types';
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

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSuccess: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditUserDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      username: user.username,
      fullName: user.fullName,
      role: user.role as 'admin' | 'user',
      isActive: user.isActive,
      newPassword: '',
    },
  });

  const selectedRole = watch('role');
  const isActive = watch('isActive');

  // Reset form when user changes
  useEffect(() => {
    reset({
      username: user.username,
      fullName: user.fullName,
      role: user.role as 'admin' | 'user',
      isActive: user.isActive,
      newPassword: '',
    });
  }, [user, reset]);

  const onSubmit = async (data: UpdateUserFormData) => {
    try {
      setIsSubmitting(true);

      // Usar la API para actualizar el usuario
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user.id,
          username: data.username,
          fullName: data.fullName,
          role: data.role,
          isActive: data.isActive,
          newPassword: data.newPassword || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo actualizar el usuario',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Éxito',
        description: SUCCESS_MESSAGES.UPDATED,
        variant: 'success',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating user:', error);
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

  const isCurrentUser = currentUser?.id === user.id;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Modifique los datos del usuario @{user.username}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre completo */}
          <div className="space-y-2">
            <Label htmlFor="edit-fullName" required>
              Nombre Completo
            </Label>
            <Input
              id="edit-fullName"
              placeholder="Ej: Juan Pérez"
              {...register('fullName')}
              error={errors.fullName?.message}
              disabled={isSubmitting}
            />
          </div>

          {/* Usuario */}
          <div className="space-y-2">
            <Label htmlFor="edit-username" required>
              Usuario
            </Label>
            <Input
              id="edit-username"
              placeholder="Ej: jperez"
              {...register('username')}
              error={errors.username?.message}
              disabled={isSubmitting}
            />
          </div>

          {/* Rol */}
          <div className="space-y-2">
            <Label htmlFor="edit-role" required>
              Rol
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(value: 'admin' | 'user') => setValue('role', value)}
              disabled={isSubmitting || isCurrentUser}
            >
              <SelectTrigger error={errors.role?.message}>
                <SelectValue placeholder="Seleccione un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USER_ROLES.ADMIN}>Administrador</SelectItem>
                <SelectItem value={USER_ROLES.USER}>Usuario</SelectItem>
              </SelectContent>
            </Select>
            {isCurrentUser && (
              <p className="text-xs text-muted-foreground">
                No puedes cambiar tu propio rol
              </p>
            )}
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="edit-status" required>
              Estado
            </Label>
            <Select
              value={isActive ? 'active' : 'inactive'}
              onValueChange={(value) => setValue('isActive', value === 'active')}
              disabled={isSubmitting || isCurrentUser}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            {isCurrentUser && (
              <p className="text-xs text-muted-foreground">
                No puedes desactivar tu propia cuenta
              </p>
            )}
          </div>

          {/* Nueva contraseña (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="edit-newPassword">
              Nueva Contraseña (opcional)
            </Label>
            <div className="relative">
              <Input
                id="edit-newPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Dejar vacío para no cambiar"
                className="pr-10"
                {...register('newPassword')}
                error={errors.newPassword?.message}
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
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
