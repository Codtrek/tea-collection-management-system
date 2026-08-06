import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Dimensions, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn } from '@/components/ui/demo-teacollector-button';
import { Card } from '@/components/ui/demo-teacollector-card';
import { HomeStatsRow } from '@/components/ui/demo-teacollector-cards';
import { c, fontDisplay, fontMono } from '@/components/ui/demo-teacollector-theme';
import { colors } from '@/theme/colors';
import HStack from '@/components/layout/Hstack';
import VStack from '@/components/layout/Vstack';
import heroImage from '@/assets/images/tea-collector-home-bg.jpg';

const { width } = Dimensions.get('window');

export default function DemoTeaCollectorHome({ setTab, setSheet, fertRequests }: any) {
  const confirmedCount = fertRequests.filter((r: any) => r.status === 'confirmed').length;
  const loadedCount = fertRequests.filter((r: any) => r.status === 'loaded').length;



  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 100, backgroundColor: colors.background }}>
      <ImageBackground
        source={heroImage}
        style={{ width: width, marginHorizontal: -20, overflow: 'hidden' }}
        imageStyle={{ resizeMode: 'cover' }}
      >
        <View style={{ padding: 24, backgroundColor: 'rgba(8, 36, 24, 0.62)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontSize: 12, color: '#BFE0C6', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Today's collection
              </Text>
              <Text style={{
                fontFamily: fontDisplay.fontFamily,
                fontWeight: '700',
                marginTop: 8,
                fontSize: 28,
                color: '#fff',
                lineHeight: 36,
              }}>
                Collection Tasks
              </Text>
              <Text style={{
                fontFamily: fontMono.fontFamily,
                fontSize: 13,
                color: '#DCEAE1',
                marginTop: 14,
                lineHeight: 20,
              }}>
                7 pickup requests · Factory: Kotmale MPT
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{
                borderRadius: 18,
                paddingHorizontal: 12,
                paddingVertical: 6,
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
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
            <View style={{
              minWidth: 128,
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 14,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}>
              <Text style={{
                fontFamily: fontDisplay.fontFamily,
                fontWeight: '700',
                fontSize: 24,
                color: '#fff',
              }}>
                7
              </Text>
              <Text style={{
                marginTop: 6,
                fontSize: 12,
                color: '#DCEAE1',
              }}>
                Stops today
              </Text>
            </View>
            <View style={{
              minWidth: 128,
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 14,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}>
              <Text style={{
                fontFamily: fontDisplay.fontFamily,
                fontWeight: '700',
                fontSize: 24,
                color: '#fff',
              }}>
                135 kg
              </Text>
              <Text style={{
                marginTop: 6,
                fontSize: 12,
                color: '#DCEAE1',
              }}>
                Collected so far
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 20, borderRadius: 16, overflow: 'hidden' }}>
            <ImageBackground
              source={heroImage}
              style={{ borderRadius: 16 }}
              imageStyle={{ resizeMode: 'cover' }}
            >
              <Btn
                variant="secondary"
                block
                onPress={() => setTab('collect')}
                style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.2)' }}
                textStyle={{ color: colors.primary }}
              >
                View Today's Stops
              </Btn>
            </ImageBackground>
          </View>
        </View>
      </ImageBackground>

      <HomeStatsRow
        style={{ marginTop: 16 }}
      stats={[      {
        id: 'pending',
        value: '2',
        title: 'Pending requests',
        // swapped background with Delivered today (was 'primary')
        variant: 'muted',
        iconName: 'time-outline',
      },
      {
        id: 'loaded',
        value: '2',
        title: 'Loaded, awaiting factory',
        variant: 'success',
        iconName: 'cube-outline',
      },
      {
        id: 'delivered',
        value: '1',
        title: 'Delivered today',
        // swapped background with Pending requests (was 'warning')
        variant: 'primary',
        iconName: 'checkmark-circle-outline',
      },
      {
        id: 'collected',
        value: '135 kg',
        title: 'Collected today',
        variant: 'muted',
        iconName: 'leaf-outline',
      },
    ]}
    />
    </ScrollView>
  );
}
