import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn } from '@/components/ui/demo-teacollector-button';
import { Card } from '@/components/ui/demo-teacollector-card';
import { c, fontDisplay, fontMono } from '@/components/ui/demo-teacollector-theme';

const { width } = Dimensions.get('window');

export default function DemoTeaCollectorHome({ setTab, setSheet, fertRequests }: any) {
  const confirmedCount = fertRequests.filter((r: any) => r.status === 'confirmed').length;
  const loadedCount = fertRequests.filter((r: any) => r.status === 'loaded').length;

  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 100 }}>
      <Card dark>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 12, color: '#BFE0C6' }}>Today's work</Text>
            <Text style={{
              fontFamily: fontDisplay.fontFamily,
              fontWeight: '600',
              marginTop: 2,
              fontSize: 17,
              color: '#fff',
            }}>Today's Collection Tasks</Text>
          </View>
          <View style={{
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: '#EFE6C8',
          }}>
            <Text style={{
              fontFamily: fontMono.fontFamily,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: 10,
              color: c.amberDeep,
            }}>In progress</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
          <Text style={{
            fontFamily: fontMono.fontFamily,
            fontSize: 12,
            color: '#DCEAE1',
          }}>7 pickup requests</Text>
          <Text style={{ color: '#DCEAE1' }}>·</Text>
          <Text style={{
            fontFamily: fontMono.fontFamily,
            fontSize: 12,
            color: '#DCEAE1',
          }}>Factory: Kotmale MPT</Text>
        </View>
        <Btn variant="primary" block style={{ marginTop: 14 }} onPress={() => setTab('collect')}>
          View Today's Stops
        </Btn>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        {[
          ['2', 'Pending requests'],
          ['2', 'Loaded, awaiting factory'],
          ['1', 'Delivered today'],
          ['135 kg', 'Collected today'],
        ].map(([n, l], i) => (
          <View key={i} style={{
            borderRadius: 16,
            padding: 14,
            width: (width - 60) / 2,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.line,
          }}>
            <Text style={{
              fontFamily: fontDisplay.fontFamily,
              fontWeight: 'bold',
              fontSize: 24,
              color: c.forest,
            }}>{n}</Text>
            <Text style={{
              fontSize: 12,
              marginTop: 2,
              color: c.muted,
            }}>{l}</Text>
          </View>
        ))}
      </View>

      <Text style={{
        fontFamily: fontMono.fontFamily,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        marginTop: 20,
        marginBottom: 10,
        marginLeft: 2,
        fontSize: 11,
        color: c.sageDeep,
      }}>
        Quick actions
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <TouchableOpacity
          onPress={() => setTab('collect')}
          style={{
            borderRadius: 16,
            padding: 14,
            width: (width - 60) / 2,
            backgroundColor: c.forest,
          }}>
          <Ionicons name="leaf-outline" size={22} color="#fff" />
          <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 8, color: '#fff' }}>Today's Stops</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSheet('register')}
          style={{
            borderRadius: 16,
            padding: 14,
            width: (width - 60) / 2,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.line,
          }}>
          <Ionicons name="add-outline" size={22} color={c.forestDeep} />
          <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 8, color: c.forestDeep }}>New Estate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('fert')}
          style={{
            borderRadius: 16,
            padding: 14,
            width: (width - 60) / 2,
            backgroundColor: c.forest,
          }}>
          <Ionicons name="leaf-outline" size={22} color="#fff" />
          <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 8, color: '#fff' }}>Fertilizer</Text>
          {(confirmedCount > 0 || loadedCount > 0) && (
            <Text style={{ fontSize: 12, color: '#BFE0C6', marginTop: 4 }}>
              {confirmedCount > 0 && `${confirmedCount} to load`}
              {confirmedCount > 0 && loadedCount > 0 && ' · '}
              {loadedCount > 0 && `${loadedCount} to deliver`}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('notif')}
          style={{
            borderRadius: 16,
            padding: 14,
            width: (width - 60) / 2,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.line,
          }}>
          <Ionicons name="notifications-outline" size={22} color={c.forestDeep} />
          <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 8, color: c.forestDeep }}>Notifications</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
