import React from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    TextInput,
    Switch,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    type KeyboardTypeOptions,
} from 'react-native';
import { X } from 'lucide-react-native';

/**
 * The standard form sheet.
 *
 * Every create/edit form in Setup had written its own bottom sheet: the same
 * grabber, header and footer copied six times, each drifting — a sky-blue focus
 * ring here, an emerald submit there, and black label text on a navy button that
 * was all but unreadable. This is that sheet, once.
 *
 * Two structural details are carried over from the detail sheet, both learned
 * the hard way: the backdrop is a flex sibling above the panel rather than an
 * absolute overlay across it, and nothing here animates with Reanimated, which
 * inside a native Modal leaves touch targets offset from where they are painted
 * on Android.
 */

const PLACEHOLDER = '#a3a3b2';

interface FormSheetProps {
    visible: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    onSubmit: () => void;
    submitLabel: string;
    isPending?: boolean;
    /**
     * Deleting the record being edited. Shown only when given, so a create
     * sheet never offers it — and it sits below the save button as a quiet
     * text action rather than a second button of equal weight.
     */
    onDelete?: () => void;
    deleteLabel?: string;
    children: React.ReactNode;
}

export function FormSheet({
    visible,
    title,
    subtitle,
    onClose,
    onSubmit,
    submitLabel,
    isPending = false,
    onDelete,
    deleteLabel = 'Delete',
    children,
}: FormSheetProps) {
    if (!visible) return null;

    return (
        <Modal transparent visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
            >
                <View className="flex-1 justify-end bg-black/40">
                    <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Dismiss" />

                    <View className="rounded-t-3xl bg-surface" style={{ maxHeight: '92%' }}>
                        <View className="items-center pb-1 pt-2.5">
                            <View className="h-1 w-10 rounded-full bg-surface-border" />
                        </View>

                        <View className="flex-row items-start justify-between gap-3 border-b border-surface-border px-5 pb-3.5 pt-2">
                            <View className="min-w-0 flex-1">
                                <Text className="text-ink text-[17px] font-bold" numberOfLines={1}>
                                    {title}
                                </Text>
                                {subtitle ? (
                                    <Text className="text-ink-muted text-[11.5px]" numberOfLines={1}>
                                        {subtitle}
                                    </Text>
                                ) : null}
                            </View>
                            <Pressable
                                onPress={onClose}
                                accessibilityRole="button"
                                accessibilityLabel="Close"
                                hitSlop={8}
                                className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken active:opacity-60"
                            >
                                <X size={15} color="#5c5c6b" />
                            </Pressable>
                        </View>

                        {/* flexShrink, never flex-1: inside a maxHeight panel a
                            flexed child resolves to zero height and collapses. */}
                        <ScrollView
                            style={{ flexShrink: 1 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 14 }}
                        >
                            {children}
                        </ScrollView>

                        <View className="border-t border-surface-border px-5 pb-8 pt-3">
                            <Pressable
                                onPress={onSubmit}
                                disabled={isPending}
                                accessibilityRole="button"
                                className={`h-12 flex-row items-center justify-center gap-2 rounded-xl ${
                                    isPending ? 'bg-brand-muted' : 'bg-brand active:opacity-85'
                                }`}
                            >
                                {isPending ? <ActivityIndicator size="small" color="#ffffff" /> : null}
                                <Text className="text-[13px] font-bold uppercase tracking-wider text-white">
                                    {isPending ? 'Saving' : submitLabel}
                                </Text>
                            </Pressable>

                            {onDelete ? (
                                <Pressable
                                    onPress={onDelete}
                                    disabled={isPending}
                                    accessibilityRole="button"
                                    className="mt-2 h-10 items-center justify-center rounded-xl active:bg-accent-subtle"
                                >
                                    <Text className="text-accent text-[12px] font-bold uppercase tracking-wider">
                                        {deleteLabel}
                                    </Text>
                                </Pressable>
                            ) : null}
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

/** A labelled field wrapper — use it directly when the control is custom. */
export function Field({
    label,
    required = false,
    hint,
    children,
}: {
    label: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <View className="gap-1.5">
            <Text className="text-ink-faint text-[10px] font-bold uppercase tracking-widest">
                {label}
                {required ? <Text className="text-accent"> *</Text> : null}
            </Text>
            {children}
            {hint ? <Text className="text-ink-faint text-[10.5px]">{hint}</Text> : null}
        </View>
    );
}

interface TextFieldProps {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    hint?: string;
    keyboardType?: KeyboardTypeOptions;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    autoFocus?: boolean;
    secureTextEntry?: boolean;
    /** Fixed text shown inside the box, before or after the value. */
    prefix?: string;
    suffix?: string;
}

/**
 * A text input.
 *
 * Font size and line height are set explicitly rather than left to the class —
 * without them the text shifted as you typed, which the login form hit first.
 */
export function TextField({
    label,
    value,
    onChangeText,
    placeholder,
    required = false,
    hint,
    keyboardType,
    autoCapitalize,
    autoFocus,
    secureTextEntry,
    prefix,
    suffix,
}: TextFieldProps) {
    return (
        <Field label={label} required={required} hint={hint}>
            <View className="h-12 flex-row items-center gap-1.5 rounded-xl border border-surface-border bg-surface-sunken px-3.5">
                {prefix ? (
                    <Text className="text-ink-faint shrink-0 text-[13px] font-bold">{prefix}</Text>
                ) : null}

                <TextInput
                    className="text-ink min-w-0 flex-1"
                    style={{ fontSize: 14, lineHeight: 18, paddingVertical: 0 }}
                    placeholder={placeholder}
                    placeholderTextColor={PLACEHOLDER}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoFocus={autoFocus}
                    secureTextEntry={secureTextEntry}
                />

                {suffix ? (
                    <Text className="text-ink-faint shrink-0 text-[13px] font-bold">{suffix}</Text>
                ) : null}
            </View>
        </Field>
    );
}

/** An on/off row. Green reads as active here, as it does everywhere else. */
export function ToggleField({
    label,
    hint,
    value,
    onValueChange,
}: {
    label: string;
    hint?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}) {
    return (
        <View className="flex-row items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-sunken px-3.5 py-3">
            <View className="min-w-0 flex-1">
                <Text className="text-ink text-[13px] font-semibold">{label}</Text>
                {hint ? <Text className="text-ink-faint text-[10.5px]">{hint}</Text> : null}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#d6d6e0', true: '#10b981' }}
                thumbColor="#ffffff"
            />
        </View>
    );
}

/** A pick-one row of chips, for short option lists like stations or products. */
export function ChoiceField<T extends string>({
    label,
    required = false,
    hint,
    options,
    value,
    onSelect,
    emptyMessage = 'Nothing to choose from yet',
}: {
    label: string;
    required?: boolean;
    hint?: string;
    options: { value: T; label: string }[];
    value: T | null;
    onSelect: (value: T) => void;
    emptyMessage?: string;
}) {
    return (
        <Field label={label} required={required} hint={hint}>
            {options.length === 0 ? (
                <View className="rounded-xl border border-surface-border bg-surface-sunken px-3.5 py-3">
                    <Text className="text-ink-muted text-[12px]">{emptyMessage}</Text>
                </View>
            ) : (
                <View className="flex-row flex-wrap gap-2">
                    {options.map((option) => {
                        const selected = option.value === value;

                        return (
                            <Pressable
                                key={option.value}
                                onPress={() => onSelect(option.value)}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                                className={`rounded-full px-3.5 py-2 ${
                                    selected
                                        ? 'bg-brand'
                                        : 'border border-surface-border bg-surface active:bg-surface-sunken'
                                }`}
                            >
                                <Text
                                    className={`text-[12px] font-bold ${
                                        selected ? 'text-white' : 'text-ink-muted'
                                    }`}
                                >
                                    {option.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </Field>
    );
}
