import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

interface Props {
    children: ReactNode;
    label?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Diagnostic Error Boundary — catches JS crashes and renders
 * the error + stack on-screen so they are visible in preview builds.
 */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null, errorInfo: null };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        console.error(`[ErrorBoundary${this.props.label ? ` — ${this.props.label}` : ''}]`, error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' }}>
                    <Text style={{ color: '#ef4444', fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>
                        💥 Crash Caught {this.props.label ? `(${this.props.label})` : ''}
                    </Text>
                    <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: '600', marginBottom: 16 }}>
                        {this.state.error?.message}
                    </Text>
                    <ScrollView
                        style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 12, maxHeight: 400 }}
                    >
                        <Text style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>
                            {this.state.error?.stack}
                        </Text>
                        {this.state.errorInfo && (
                            <Text style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', marginTop: 12 }}>
                                Component Stack:{'\n'}{this.state.errorInfo.componentStack}
                            </Text>
                        )}
                    </ScrollView>
                    <TouchableOpacity
                        onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                        style={{
                            marginTop: 20,
                            backgroundColor: '#3b82f6',
                            paddingVertical: 14,
                            borderRadius: 12,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}
