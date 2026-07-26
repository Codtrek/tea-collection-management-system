import React from 'react';
import {View,Text,StyleSheet} from 'react-native';
import {c} from './demo-teacollector-theme';


export const DetailRow = ({k,v}:any)=>{

return(
<View style={styles.detailRow}>

<Text style={styles.detailKey}>
{k}
</Text>

<Text style={styles.detailValue}>
{v}
</Text>

</View>
)

}



const styles=StyleSheet.create({

detailRow:{
 flexDirection:'row',
 justifyContent:'space-between',
 alignItems:'center',
 paddingVertical:6
},

detailKey:{
 color:c.muted,
 fontSize:14,
 flex:1
},

detailValue:{
 color:c.ink,
 fontSize:14,
 fontWeight:'600',
 flex:1,
 textAlign:'right'
}

});