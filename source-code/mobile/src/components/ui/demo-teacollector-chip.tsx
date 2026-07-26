import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { c } from './demo-teacollector-theme';


export const Chip = ({active=false,onPress,children}:any)=>{

return(
<TouchableOpacity
 onPress={onPress}
 style={[styles.chip,active && styles.chipActive]}
>

<Text style={[
 styles.chipText,
 active && styles.chipTextActive
]}>
{children}
</Text>

</TouchableOpacity>
)

}



const styles=StyleSheet.create({

chip:{
 borderRadius:999,
 borderWidth:1,
 borderColor:c.line,
 paddingHorizontal:12,
 paddingVertical:8,
 backgroundColor:c.card
},

chipActive:{
 backgroundColor:c.forest,
 borderColor:c.forest
},

chipText:{
 color:c.ink,
 fontSize:13,
 fontWeight:'600'
},

chipTextActive:{
 color:'#fff'
}

});