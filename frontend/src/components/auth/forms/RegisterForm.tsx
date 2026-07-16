import { Lock, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import useRegisterForm from "@/hooks/forms/auth/useRegisterForm";
import BaseInput, { PasswordInput } from "@/components/layout/input/BaseInput";
import PolicyAgreementDrawer from "@/components/auth/PolicyAgreementDrawer";

export default function RegisterForm() {
  const { form, handleSubmitClick, shouldShowError } = useRegisterForm();
  const [policyDrawerOpen, setPolicyDrawerOpen] = useState(false);

  const submitRegistration = async () => {
    const result = await handleSubmitClick();
    if (!result.acceptedPolicies) {
      setPolicyDrawerOpen(true);
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormControl>
                <BaseInput
                  {...field}
                  id={field.name}
                  label="Username"
                  labelIcon={User}
                  placeholder="Enter your username"
                  invalid={shouldShowError(fieldState.isTouched, !!fieldState.error)}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormControl>
                <PasswordInput
                  {...field}
                  id={field.name}
                  label="Password"
                  labelIcon={Lock}
                  placeholder="Enter your password"
                  invalid={shouldShowError(fieldState.isTouched, !!fieldState.error)}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormControl>
                <PasswordInput
                  {...field}
                  id={field.name}
                  label="Confirm Password"
                  labelIcon={Lock}
                  placeholder="Confirm your password"
                  invalid={shouldShowError(fieldState.isTouched, !!fieldState.error)}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="acceptPolicies"
          render={({ field, fieldState }) => (
            <FormItem className="gap-2 rounded-xl p-3">
              <div className="flex items-start gap-3">
                <FormControl>
                  <Checkbox
                    id={field.name}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    aria-invalid={shouldShowError(fieldState.isTouched, !!fieldState.error)}
                    className="mt-0.5"
                  />
                </FormControl>
                <div className="text-sm font-medium leading-relaxed">
                  <Label htmlFor={field.name} className="cursor-pointer">
                    I agree to the{" "}
                  </Label>
                  <PolicyAgreementDrawer
                    open={policyDrawerOpen}
                    onOpenChange={setPolicyDrawerOpen}
                  />
                  <span>.</span>
                </div>
              </div>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <Button icon={undefined} type="button" className="w-full" onClick={submitRegistration}>
          Create Account
        </Button>
      </form>
    </Form>
  );
}