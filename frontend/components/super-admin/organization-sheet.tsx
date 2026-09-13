import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
    useOrganizationsStore,
    getOrganizationsIndexQueryKey,
} from '@/features/api/organization/organization';
import { useUpdateOrganization } from '@/features/organizations';
import { FormSheet, TextField, ToggleField } from '@/components/form-sheet';
import { getApiErrorMessage } from '@/lib/api-error';
import type { OrganizationResource } from '@/features/api/model';

interface OrganizationSheetProps {
    visible: boolean;
    onClose: () => void;
    /** Present when editing an existing tenant. */
    organization?: OrganizationResource;
    /** Offered only when editing. */
    onDelete?: (organization: OrganizationResource) => void;
}

/** A URL-safe key derived from the name, unless the owner types their own. */
function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Creating and editing a tenant, on the app's shared form sheet.
 *
 * This replaces two hand-rolled sheets whose submit buttons were orange with
 * black labels, and adds the editing half: a tenant could be created and then
 * never renamed or switched off.
 */
export function OrganizationSheet({
    visible,
    onClose,
    organization,
    onDelete,
}: OrganizationSheetProps) {
    const queryClient = useQueryClient();
    const isEditing = Boolean(organization);

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    useEffect(() => {
        if (!visible) return;

        if (organization) {
            setName(organization.name);
            setSlug(organization.slug);
            setIsActive(organization.status === 'active');
            // An existing slug is deliberate — never re-derive it from the name.
            setSlugManuallyEdited(true);
        } else {
            setName('');
            setSlug('');
            setIsActive(true);
            setSlugManuallyEdited(false);
        }
    }, [visible, organization]);

    useEffect(() => {
        if (!slugManuallyEdited && name) {
            setSlug(slugify(name));
        }
    }, [name, slugManuallyEdited]);

    const storeMutation = useOrganizationsStore({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getOrganizationsIndexQueryKey() });
                onClose();
            },
            onError: (error) => {
                Alert.alert('Could not create organization', getApiErrorMessage(error));
            },
        },
    });

    const updateMutation = useUpdateOrganization();

    const handleSubmit = useCallback(() => {
        if (!name.trim()) {
            Alert.alert('Name required', 'An organization needs a name.');
            return;
        }
        if (!slug.trim()) {
            Alert.alert('Key required', 'An organization needs a key.');
            return;
        }

        if (isEditing && organization) {
            updateMutation.mutate(
                {
                    id: organization.id,
                    name: name.trim(),
                    slug: slug.trim(),
                    status: isActive ? 'active' : 'inactive',
                },
                {
                    onSuccess: onClose,
                    onError: (error) =>
                        Alert.alert('Could not save organization', getApiErrorMessage(error)),
                }
            );
            return;
        }

        storeMutation.mutate({ data: { name: name.trim(), slug: slug.trim() } });
    }, [name, slug, isActive, isEditing, organization, storeMutation, updateMutation, onClose]);

    return (
        <FormSheet
            visible={visible}
            title={isEditing ? 'Edit organization' : 'New organization'}
            subtitle={isEditing ? organization?.name : 'A tenant with its own stations and staff'}
            onClose={onClose}
            onSubmit={handleSubmit}
            submitLabel={isEditing ? 'Save organization' : 'Create organization'}
            isPending={storeMutation.isPending || updateMutation.isPending}
            onDelete={
                isEditing && onDelete && organization ? () => onDelete(organization) : undefined
            }
            deleteLabel="Delete organization"
        >
            <TextField
                label="Organization name"
                required
                value={name}
                onChangeText={setName}
                placeholder="Octane Fuels Ltd"
                autoFocus={!isEditing}
            />

            <TextField
                label="Key"
                required
                value={slug}
                onChangeText={(value) => {
                    setSlugManuallyEdited(true);
                    setSlug(value);
                }}
                placeholder="octane-fuels-ltd"
                autoCapitalize="none"
                hint="Derived from the name until you change it."
            />

            {isEditing ? (
                <ToggleField
                    label="Active"
                    hint="An inactive tenant keeps all its records but stops being served."
                    value={isActive}
                    onValueChange={setIsActive}
                />
            ) : null}
        </FormSheet>
    );
}
