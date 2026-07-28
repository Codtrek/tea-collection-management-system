import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pill } from '@/components/ui/demo-teacollector-pill';
import { Btn } from '@/components/ui/demo-teacollector-button';
import { Card } from '@/components/ui/demo-teacollector-card';
import { StopCard } from '@/components/ui/demo-teacollector-cards';
import { c, fontDisplay, fontMono } from '@/components/ui/demo-teacollector-theme';

const { width } = Dimensions.get('window');

export default function DemoTeaCollectorCollect({ stops, segment, setSegment, onViewDetails, onArrivedDetails, onGoToFactory, setSheet, history }: any) {
  const loaded = stops.filter((s: any) => s.status === 'loaded');
  const totalLoaded = loaded.reduce((sum: number, s: any) => sum + (s.actualWeight || 0), 0);

  const groups = [
    { key: 'pending', label: 'Needs your response', items: stops.filter((s: any) => s.status === 'pending') },
    { key: 'active', label: 'Accepted', items: stops.filter((s: any) => s.status === 'accepted') },
    { key: 'loaded-group', label: 'Loaded', items: stops.filter((s: any) => s.status === 'loaded') },
    { key: 'cancelled', label: 'Cancelled', items: stops.filter((s: any) => s.status === 'cancelled') },
  ];

  const deliveredToday = stops.filter((s: any) => s.status === 'delivered');

  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 100 }}>
      <View style={{
        flexDirection: 'row',
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
        backgroundColor: '#E9E4D3',
      }}>
        {['today', 'hist'].map((seg) => (
          <TouchableOpacity
            key={seg}
            onPress={() => setSegment(seg)}
            style={{
              flex: 1,
              borderRadius: 10,
              paddingVertical: 10,
              backgroundColor: segment === seg ? c.forest : 'transparent',
            }}
          >
            <Text style={{
              fontWeight: '600',
              fontSize: 15,
              textAlign: 'center',
              color: segment === seg ? '#fff' : c.muted,
            }}>
              {seg === 'today' ? 'Today' : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {segment === 'today' ? (
        <>
          {loaded.length > 0 && (
            <Card dark style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.14)',
                }}>
                  <Ionicons name="business-outline" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: fontDisplay.fontFamily,
                    fontWeight: '600',
                    fontSize: 15,
                    color: '#fff',
                  }}>
                    {loaded.length} stop{loaded.length > 1 ? 's' : ''} loaded · {totalLoaded} kg
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    marginTop: 2,
                    color: '#BFE0C6',
                  }}>Ready whenever you head to Kotmale MPT</Text>
                </View>
              </View>
              <Btn variant="primary" block style={{ marginTop: 14 }} onPress={onGoToFactory}>
                Navigate to Factory
              </Btn>
            </Card>
          )}

          {groups.filter((g) => g.items.length > 0).map((g) => (
            <View key={g.key}>
              <Text style={{
                fontFamily: fontMono.fontFamily,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 1.8,
                marginBottom: 10,
                marginLeft: 2,
                fontSize: 11,
                color: c.sageDeep,
              }}>
                {g.label} · {g.items.length}
              </Text>
              {g.items.map((s: any) => (
                <StopCard key={s.id} stop={s} onViewDetails={onViewDetails} onArrivedDetails={onArrivedDetails} />
              ))}
            </View>
          ))}

          <Btn variant="ghost" block style={{ marginTop: 8 }} onPress={() => setSheet('register')}>
            + Register New Estate
          </Btn>
        </>
      ) : (
        <>
          {deliveredToday.length > 0 && (
            <>
              <Text style={{
                fontFamily: fontMono.fontFamily,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 1.8,
                marginBottom: 10,
                marginLeft: 2,
                fontSize: 11,
                color: c.sageDeep,
              }}>
                Delivered today
              </Text>
              {deliveredToday.map((s: any) => (
                <View key={s.id} style={{
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  backgroundColor: c.card,
                  borderWidth: 1,
                  borderColor: c.line,
                }}>
                  <View>
                    <Text style={{
                      fontFamily: fontDisplay.fontFamily,
                      fontWeight: '600',
                      fontSize: 16,
                    }}>{s.name}</Text>
                    <Text style={{
                      fontSize: 12,
                      marginTop: 2,
                      color: c.muted,
                    }}>Today · {s.actualWeight} kg</Text>
                  </View>
                  <Pill status={s.mismatch ? 'mismatch' : 'delivered'} />
                </View>
              ))}
            </>
          )}
          <Text style={{
            fontFamily: fontMono.fontFamily,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: 1.8,
            marginBottom: 10,
            marginLeft: 2,
            marginTop: 16,
            fontSize: 11,
            color: c.sageDeep,
          }}>
            Earlier this week
          </Text>
          {history.map((h: any, i: number) => (
            <View key={i} style={{
              borderRadius: 16,
              padding: 16,
              marginBottom: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.line,
            }}>
              <View>
                <Text style={{
                  fontFamily: fontDisplay.fontFamily,
                  fontWeight: '600',
                  fontSize: 16,
                }}>{h.name}</Text>
                <Text style={{
                  fontSize: 12,
                  marginTop: 2,
                  color: c.muted,
                }}>{h.date} · {h.type} · {h.weight} kg</Text>
              </View>
              <Pill status="delivered">Delivered</Pill>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
