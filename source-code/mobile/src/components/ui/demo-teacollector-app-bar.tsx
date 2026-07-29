import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { c, fontDisplay, fontMono } from './demo-teacollector-theme';

export const AppBar = ({ eyebrow, title, dark = false, sub }: any) => {
  return (
    <View style={[styles.appBar, dark && styles.appBarDark]}>

      {eyebrow && (
        <Text style={[styles.eyebrow, dark && styles.eyebrowDark]}>
          {eyebrow}
        </Text>
      )}

      <Text style={[styles.title, dark && styles.titleDark]}>
        {title}
      </Text>

      {sub && (
        <View style={styles.subRow}>
          {sub.map((item:string,index:number)=>(
            <Text
              key={`${item}-${index}`}
              style={[styles.subText, dark && styles.subTextDark]}
            >
              {item}
            </Text>
          ))}
        </View>
      )}

    </View>
  );
};


const styles = StyleSheet.create({

  appBar:{
    paddingHorizontal:20,
    paddingTop:18,
    paddingBottom:14,
    backgroundColor:c.mist,
  },

  appBarDark:{
    backgroundColor:c.forestDeep,
  },

  eyebrow:{
    fontFamily:fontMono.fontFamily,
    fontSize:11,
    color:c.sageDeep,
    textTransform:'uppercase',
    letterSpacing:1.5,
  },

  eyebrowDark:{
    color:'#BFE0C6'
  },

  title:{
    fontFamily:fontDisplay.fontFamily,
    fontWeight:'700',
    fontSize:22,
    color:c.forestDeep,
    marginTop:2,
  },

  titleDark:{
    color:'#fff'
  },

  subRow:{
    flexDirection:'row',
    flexWrap:'wrap',
    marginTop:8,
  },

  subText:{
    fontSize:12,
    color:c.muted,
    marginRight:10,
  },

  subTextDark:{
    color:'#DCEAE1'
  }

});