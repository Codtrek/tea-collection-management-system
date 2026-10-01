import React from 'react';
import {View,Text,StyleSheet} from 'react-native';
import {colors} from '@/theme/colors';
import {fonts} from '@/theme/fonts';


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
 color:colors.text.muted,
 fontSize:14,
 fontFamily:fonts.default,
 flex:1
},

detailValue:{
 color:colors.text.primary,
 fontSize:14,
 fontFamily:fonts.default,
 fontWeight:'600',
 flex:1,
 textAlign:'right'
}

});