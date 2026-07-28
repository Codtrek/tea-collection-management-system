import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { DetailRow } from '@/components/ui/demo-teacollector-detail-row';
import { Btn } from '@/components/ui/demo-teacollector-button';
import { Card } from '@/components/ui/demo-teacollector-card';
import { c, fontDisplay, fontMono } from '@/components/ui/demo-teacollector-theme';

export default function DemoTeaCollectorProfile() {
  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 100 }}>
      <View style={{
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        backgroundColor: c.forest,
      }}>
        <View style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          backgroundColor: c.amber,
        }}>
          <Text style={{
            fontFamily: fontDisplay.fontFamily,
            fontWeight: 'bold',
            fontSize: 20,
            color: '#fff',
          }}>SR</Text>
        </View>
        <Text style={{
          fontFamily: fontDisplay.fontFamily,
          fontWeight: '600',
          fontSize: 20,
          color: '#fff',
        }}>Sunil Ranasinghe</Text>
        <Text style={{
          fontFamily: fontMono.fontFamily,
          fontSize: 12,
          opacity: 0.75,
          marginTop: 2,
          color: '#fff',
        }}>EMP-2291 · Kotmale MPT Factory</Text>
      </View>
      <Card>
        <DetailRow k="Phone" v="071 234 5678" />
        <DetailRow k="Vehicle" v="LP-4471" />
      </Card>
      <Btn variant="ghost" block style={{ marginBottom: 10 }}>Change Password</Btn>
      <Btn variant="danger" block>Logout</Btn>
    </ScrollView>
  );
}
