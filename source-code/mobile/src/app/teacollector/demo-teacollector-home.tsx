import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn } from '@/components/ui/demo-teacollector-button';
import { Card } from '@/components/ui/demo-teacollector-card';
import { c, fontDisplay, fontMono } from '@/components/ui/demo-teacollector-theme';
import { colors } from '@/theme/colors';
import HStack from '@/components/layout/Hstack';
import VStack from '@/components/layout/Vstack';

const { width } = Dimensions.get('window');

export default function DemoTeaCollectorHome({ setTab, setSheet, fertRequests }: any) {
  const confirmedCount = fertRequests.filter((r: any) => r.status === 'confirmed').length;
  const loadedCount = fertRequests.filter((r: any) => r.status === 'loaded').length;

  const summaryCards = [
    ['2', 'Pending requests'],
    ['2', 'Loaded, awaiting factory'],
    ['1', 'Delivered today'],
    ['135 kg', 'Collected today'],
  ] as const;

  const cardMinWidth = (width - 60) / 2;

  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 100, backgroundColor: colors.background }}>
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

      <VStack spacing={10} style={{ marginBottom: 14 }}>
        {[0, 1].map((row) => (
          <HStack key={row} spacing={10} style={{ width: '100%' }}>
            {summaryCards.slice(row * 2, row * 2 + 2).map(([n, l], i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  minWidth: cardMinWidth,
                  borderRadius: 16,
                  padding: 14,
                  backgroundColor: c.card,
                  borderWidth: 1,
                  borderColor: c.line,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontDisplay.fontFamily,
                    fontWeight: 'bold',
                    fontSize: 24,
                    color: c.forest,
                  }}
                >
                  {n}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    marginTop: 2,
                    color: c.muted,
                  }}
                >
                  {l}
                </Text>
              </View>
            ))}
          </HStack>
        ))}
      </VStack>

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
      <VStack spacing={10} style={{ marginBottom: 20 }}>
        {[
          {
            key: 'stops',
            onPress: () => setTab('collect'),
            icon: 'leaf-outline',
            iconColor: '#fff',
            title: "Today's Stops",
            titleColor: '#fff',
            style: { backgroundColor: c.forest },
          },
          {
            key: 'register',
            onPress: () => setSheet('register'),
            icon: 'add-outline',
            iconColor: c.forestDeep,
            title: 'New Estate',
            titleColor: c.forestDeep,
            style: {
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.line,
            },
          },
          {
            key: 'fert',
            onPress: () => setTab('fert'),
            icon: 'leaf-outline',
            iconColor: '#fff',
            title: 'Fertilizer',
            titleColor: '#fff',
            style: { backgroundColor: c.forest },
            badge: (confirmedCount > 0 || loadedCount > 0) ? `${confirmedCount > 0 ? `${confirmedCount} to load` : ''}${confirmedCount > 0 && loadedCount > 0 ? ' · ' : ''}${loadedCount > 0 ? `${loadedCount} to deliver` : ''}` : undefined,
          },
          {
            key: 'notif',
            onPress: () => setTab('notif'),
            icon: 'notifications-outline',
            iconColor: c.forestDeep,
            title: 'Notifications',
            titleColor: c.forestDeep,
            style: {
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.line,
            },
          },
        ].reduce((rows, action, index, actions) => {
          if (index % 2 === 0) {
            rows.push(actions.slice(index, index + 2));
          }
          return rows;
        }, [] as any[]).map((row, rowIndex) => (
          <HStack key={rowIndex} spacing={10} style={{ width: '100%' }}>
            {row.map((action: any) => (
              <TouchableOpacity
                key={action.key}
                onPress={action.onPress}
                style={{
                  flex: 1,
                  minWidth: (width - 60) / 2,
                  borderRadius: 16,
                  padding: 14,
                  ...action.style,
                }}
              >
                <Ionicons name={action.icon} size={22} color={action.iconColor} />
                <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 8, color: action.titleColor }}>{action.title}</Text>
                {action.badge && (
                  <Text style={{ fontSize: 12, color: '#BFE0C6', marginTop: 4 }}>{action.badge}</Text>
                )}
              </TouchableOpacity>
            ))}
          </HStack>
        ))}
      </VStack>
    </ScrollView>
  );
}
