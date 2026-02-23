<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'icon' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled: boolean = false;
  export let type: string = 'button';
  export let ariaLabel: string = '';

  /**
   * Compute Tailwind classes based on variant and size.
   * Uses CSS variables defined in app.css for colors, ensuring light/dark themes work.
   */
  const baseClasses =
    'rounded-sm transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-periwinkle)]';

  const variantClasses = {
    primary: `bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] hover:bg-[var(--color-text-espresso)] hover:text-[var(--color-bg-cream)]`,
    secondary: `bg-transparent text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] hover:bg-[var(--color-bg-sand)]`,
    icon: `bg-transparent p-2 hover:bg-[var(--color-bg-sand)]`
  }[variant];

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3 text-lg'
  }[size];

  $: classes = `${baseClasses} ${variantClasses} ${sizeClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
</script>

<button
  {type}
  class={classes}
  disabled={disabled}
  aria-label={ariaLabel}
>
  <slot />
</button>
