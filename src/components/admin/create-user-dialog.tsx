'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Package, Store, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createUserSchema, CreateUserFormData } from '@/lib/validations';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, USER_ROLES } from '@/lib/constants';
import { UserPermissions } from '@/types';
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
  Checkbox,
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
  const [permissions, setPermissions] = useState<UserPermissions>({
    inventario: true,
    tiendas: true,
    cotizaciones: true,
  });
  const { toast } = useToast();

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

      // Usar la API para crear el usuario
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
          fullName: data.fullName,
          role: data.role,
          permissions,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo crear el usuario',
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
    setPermissions({ inventario: true, tiendas: true, cotizaciones: true });
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
              placeholder="Ingrese nombre completo"
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
              placeholder="Ingrese usuario"
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

          {/* Permisos */}
          <div className="space-y-2">
            <Label>Permisos de Módulos</Label>
            <div className="grid grid-cols-1 gap-2 rounded-md border p-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="perm-inventario"
                  checked={permissions.inventario}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, inventario: !!checked })
                  }
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="perm-inventario"
                  className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                >
                  <Package className="h-4 w-4 text-blue-500" />
                  Inventario
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="perm-tiendas"
                  checked={permissions.tiendas}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, tiendas: !!checked })
                  }
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="perm-tiendas"
                  className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                >
                  <Store className="h-4 w-4 text-green-500" />
                  Tiendas
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="perm-cotizaciones"
                  checked={permissions.cotizaciones}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, cotizaciones: !!checked })
                  }
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="perm-cotizaciones"
                  className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-orange-500" />
                  Cotizaciones
                </label>
              </div>
            </div>
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
