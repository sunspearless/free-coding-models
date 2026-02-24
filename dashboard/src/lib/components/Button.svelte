<script lang="ts">
  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    type = 'button',
    ariaLabel = '',
    onclick,
    children
  }: {
    variant?: 'primary' | 'secondary' | 'icon'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    type?: string
    ariaLabel?: string
    onclick?: (e: MouseEvent) => void
    children?: Snippet
  } = $props()

  const baseClasses =
    'rounded-sm transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-periwinkle)]';

  const variantClasses = $derived({
    primary: `bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] hover:bg-[var(--color-text-espresso)] hover:text-[var(--color-bg-cream)]`,
    secondary: `bg-transparent text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] hover:bg-[var(--color-bg-sand)]`,
    icon: `bg-transparent p-2 hover:bg-[var(--color-bg-sand)]`
  }[variant]);

  const sizeClasses = $derived({
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3 text-lg'
  }[size]);

  let classes = $derived(`${baseClasses} ${variantClasses} ${sizeClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`);
</script>

<button
  {type}
  class={classes}
  {disabled}
  aria-label={ariaLabel}
  {onclick}
>
  {@render children?.()}
</button>
