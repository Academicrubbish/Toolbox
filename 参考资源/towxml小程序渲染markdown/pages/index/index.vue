<template>
  <div class="wrap">
    <towxml :nodes="html" />
  </div>
</template>

<script>
export default {
  data() {
    return {
      html: '',
    };
  },
  mounted() {
    let str = `
# 一
## 二
### 三
#### 四
##### 五
###### 六
> 你好，这是引用
- ***无序***
1. ***有序***
	| 1    | 1    | 1    |
	| ---- | ---- | ---- |
	| 2    | 2    | 2    |
	| 3    | 3    | 3    |
	| 4    | 4    | 4    |

`
    this.html = this.towxml(str, 'markdown', {
      theme: 'dark',
      events: {
        tap: (e) => {
          console.log('tap', e);
        }
      }
    })
  },
};
</script>