import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';

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

    private getErrorText(): string {
        const parts: string[] = [];
        if (this.props.label) parts.push(`Label: ${this.props.label}`);
        if (this.state.error?.message) parts.push(`Error: ${this.state.error.message}`);
        if (this.state.error?.stack) parts.push(`\nStack:\n${this.state.error.stack}`);
        if (this.state.errorInfo?.componentStack) parts.push(`\nComponent Stack:\n${this.state.errorInfo.componentStack}`);
        return parts.join('\n');
    }

    private handleCopy = async () => {
        const text = this.getErrorText();
        try {
            await Share.share({ message: text });
        } catch {
            Alert.alert('Error details', text);
        }
    };

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
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                        <TouchableOpacity
                            onPress={this.handleCopy}
                            style={{
                                flex: 1,
                                backgroundColor: '#334155',
                                paddingVertical: 14,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>📋 Copy Error</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                            style={{
                                flex: 1,
                                backgroundColor: '#3b82f6',
                                paddingVertical: 14,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}
