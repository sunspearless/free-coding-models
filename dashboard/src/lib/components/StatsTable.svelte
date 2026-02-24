<script lang="ts">
    import {
        Star,
        TrendingUp,
        TrendingDown,
        TrendingUpDown,
        Hourglass,
        Rocket,
        CircleCheck,
        Turtle,
        Skull,
    } from "@lucide/svelte";
    import ModelRow from "./ModelRow.svelte";

    let {
        models,
        pingHistory,
        onModelPing,
        onToggleFavorite,
        favorites,
        sortBy = $bindable("avgPing"),
        sortAsc = $bindable(true),
        onSort,
    }: {
        models: any[];
        pingHistory: Record<
            string,
            Array<{
                ms: number;
                code: string;
                timestamp: number;
                status: string;
            }>
        >;
        onModelPing: (model: any) => Promise<void>;
        onToggleFavorite: (modelId: string) => void;
        favorites: Set<string>;
        sortBy?: "model" | "avgPing" | "uptime" | "lastPing";
        sortAsc?: boolean;
        onSort?: (
            sortBy: "model" | "avgPing" | "uptime" | "lastPing",
            sortAsc: boolean,
        ) => void;
    } = $props();

    function handleSort(column: "model" | "avgPing" | "uptime" | "lastPing") {
        if (sortBy === column) {
            sortAsc = !sortAsc;
        } else {
            sortBy = column;
            sortAsc = true;
        }
        if (onSort) onSort(sortBy, sortAsc);
    }

    function getSortedModels() {
        const modelsWithStats = models.filter(
            (m) => pingHistory[m.modelId]?.length > 0,
        );

        return modelsWithStats.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case "model":
                    comparison = a.label.localeCompare(b.label);
                    break;
                case "avgPing":
                    const avgA = calculateAveragePing(a.modelId);
                    const avgB = calculateAveragePing(b.modelId);
                    comparison =
                        avgA === Infinity
                            ? 1
                            : avgB === Infinity
                              ? -1
                              : avgA - avgB;
                    break;
                case "uptime":
                    const upA = parseInt(getUptimePercentage(a.modelId));
                    const upB = parseInt(getUptimePercentage(b.modelId));
                    comparison = upA - upB;
                    break;
                case "lastPing":
                    const histA = pingHistory[a.modelId] || [];
                    const histB = pingHistory[b.modelId] || [];
                    const timeA = histA[0]?.timestamp || 0;
                    const timeB = histB[0]?.timestamp || 0;
                    comparison = timeA - timeB;
                    break;
            }

            return sortAsc ? comparison : -comparison;
        });
    }

    function calculateAveragePing(modelId: string): number {
        const history = pingHistory[modelId] || [];
        const successfulPings = history.filter((p) => p.code === "200");
        if (successfulPings.length === 0) return Infinity;
        return Math.round(
            successfulPings.reduce((sum, p) => sum + p.ms, 0) /
                successfulPings.length,
        );
    }

    function getUptimePercentage(modelId: string): string {
        const history = pingHistory[modelId] || [];
        if (history.length === 0) return "0%";
        const successful = history.filter((p) => p.status === "up").length;
        return `${Math.round((successful / history.length) * 100)}%`;
    }

    function getStatusTrend(modelId: string) {
        const history = pingHistory[modelId] || [];
        if (history.length < 2)
            return {
                icon: null,
                label: "—",
                color: "text-[var(--color-text-taupe)]",
            };

        const recent = history.slice(0, 3); // Last 3 pings
        const upCount = recent.filter((p) => p.status === "up").length;

        if (upCount === 3)
            return {
                icon: TrendingUp,
                label: "Stable",
                color: "text-[var(--color-accent-olive)]",
            };
        if (upCount === 2)
            return {
                icon: TrendingUp,
                label: "Improving",
                color: "text-[var(--color-accent-olive)]",
            };
        if (upCount === 1)
            return {
                icon: TrendingDown,
                label: "Declining",
                color: "text-[var(--color-accent-terracotta)]",
            };
        return {
            icon: TrendingDown,
            label: "Unstable",
            color: "text-[var(--color-accent-terracotta)]",
        };
    }

    function getVerdictFromAverage(avg: number) {
        if (avg === Infinity)
            return {
                icon: Hourglass,
                label: "Pending",
                color: "text-[var(--color-text-taupe)]",
            };
        if (avg < 400)
            return {
                icon: Rocket,
                label: "Perfect",
                color: "text-[var(--color-accent-olive)]",
            };
        if (avg < 1000)
            return {
                icon: CircleCheck,
                label: "Normal",
                color: "text-[var(--color-accent-olive)]",
            };
        if (avg < 3000)
            return {
                icon: Turtle,
                label: "Slow",
                color: "text-[var(--color-accent-gold)]",
            };
        if (avg < 5000)
            return {
                icon: Turtle,
                label: "Very Slow",
                color: "text-[var(--color-accent-terracotta)]",
            };
        return {
            icon: Skull,
            label: "Unstable",
            color: "text-[var(--color-accent-terracotta)]",
        };
    }

    function getLatestPingTime(modelId: string): string {
        const history = pingHistory[modelId] || [];
        if (history.length === 0) return "—";

        const latest = history[0];
        const now = Date.now();
        const diff = now - latest.timestamp;
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    function getModelVerdict(modelId: string) {
        const avg = calculateAveragePing(modelId);
        return getVerdictFromAverage(avg);
    }

    function getModelTrend(modelId: string) {
        return getStatusTrend(modelId);
    }
</script>

<div class="overflow-x-auto">
    <table
        class="min-w-full divide-y divide-[var(--color-border-warm)] border border-[var(--color-border-warm)]"
    >
        <thead class="bg-[var(--color-bg-cream)]">
            <tr>
                <th
                    class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest cursor-pointer hover:text-[var(--color-text-espresso)] transition-colors"
                    onclick={() => handleSort("model")}
                >
                    Model {sortBy === "model" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th
                    class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest cursor-pointer hover:text-[var(--color-text-espresso)] transition-colors"
                    onclick={() => handleSort("avgPing")}
                >
                    Avg Ping {sortBy === "avgPing" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th
                    class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest cursor-pointer hover:text-[var(--color-text-espresso)] transition-colors"
                    onclick={() => handleSort("uptime")}
                >
                    Uptime {sortBy === "uptime" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th
                    class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest"
                >
                    Trend
                </th>
                <th
                    class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest"
                >
                    Verdict
                </th>
                <th
                    class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest cursor-pointer hover:text-[var(--color-text-espresso)] transition-colors"
                    onclick={() => handleSort("lastPing")}
                >
                    Last Ping {sortBy === "lastPing"
                        ? sortAsc
                            ? "↑"
                            : "↓"
                        : ""}
                </th>
                <th
                    class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest"
                >
                    Actions
                </th>
            </tr>
        </thead>
        <tbody
            class="bg-[var(--color-bg-sand)] divide-y divide-[var(--color-border-warm)]"
        >
            {#each getSortedModels() as model (model.modelId)}
                {@const trend = getModelTrend(model.modelId)}
                {@const verdict = getModelVerdict(model.modelId)}
                <tr
                    class="hover:bg-[var(--color-bg-cream)] transition-colors duration-200"
                >
                    <td
                        class="p-4 text-sm font-medium text-[var(--color-text-espresso)]"
                    >
                        {model.label}
                    </td>
                    <td class="p-4 text-center">
                        {#if calculateAveragePing(model.modelId) === Infinity}
                            <span
                                class="font-mono-tech text-sm text-[var(--color-text-taupe)]"
                                >—</span
                            >
                        {:else}
                            <span
                                class="font-mono-tech text-sm text-[var(--color-text-espresso)]"
                                >{calculateAveragePing(model.modelId)}ms</span
                            >
                        {/if}
                    </td>
                    <td class="p-4 text-center">
                        <span
                            class="font-semibold text-sm text-[var(--color-text-espresso)]"
                        >
                            {getUptimePercentage(model.modelId)}
                        </span>
                    </td>
                    <td class="p-4 text-center">
                        <span
                            class="text-sm font-medium flex items-center justify-center gap-1.5 {trend.color}"
                        >
                            {#if trend.icon}
                                {@const Icon = trend.icon}
                                <Icon class="w-4 h-4" />
                                {trend.label}
                            {:else}
                                —
                            {/if}
                        </span>
                    </td>
                    <td class="p-4 text-center">
                        <span
                            class="font-semibold text-sm flex items-center justify-center gap-1.5 {verdict.color}"
                        >
                            {#if verdict.icon}
                                {@const Icon = verdict.icon}
                                <Icon class="w-4 h-4" />
                            {/if}
                            {verdict.label}
                        </span>
                    </td>
                    <td class="p-4 text-center">
                        <span
                            class="text-sm font-medium text-[var(--color-text-taupe)]"
                        >
                            {getLatestPingTime(model.modelId)}
                        </span>
                    </td>
                    <td class="p-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                            <button
                                onclick={() => onToggleFavorite(model.modelId)}
                                class="p-2 hover:bg-[var(--color-bg-cream)] rounded-sm transition-all duration-300 flex items-center justify-center"
                                aria-label={favorites.has(model.modelId)
                                    ? "Remove from favorites"
                                    : "Add to favorites"}
                            >
                                <Star
                                    class="w-5 h-5"
                                    fill={favorites.has(model.modelId)
                                        ? "var(--color-accent-gold)"
                                        : "transparent"}
                                    stroke="var(--color-text-espresso)"
                                    strokeWidth={1.5}
                                />
                            </button>
                            <button
                                onclick={async () => await onModelPing(model)}
                                class="px-5 py-2.5 bg-[var(--color-accent-periwinkle)] text-[var(--color-bg-cream)] border border-[var(--color-accent-periwinkle)] rounded-sm hover:bg-[var(--color-text-espresso)] hover:border-[var(--color-text-espresso)] transition-all duration-300 text-sm font-medium tracking-wide"
                            >
                                Ping
                            </button>
                        </div>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>

    {#if getSortedModels().length === 0}
        <div class="p-12 text-center text-[var(--color-text-taupe)]">
            <p
                class="text-lg text-display font-semibold text-[var(--color-text-espresso)]"
            >
                No stats available
            </p>
            <p class="text-sm mt-2">
                Ping some models to start collecting statistics
            </p>
        </div>
    {/if}
</div>

<style>
    table {
        border-collapse: separate;
        border-spacing: 0;
    }
</style>
